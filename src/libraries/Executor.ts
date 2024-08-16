import { ChildProcess, exec, execFile, spawn } from "child_process"
import {coerce, satisfies} from 'semver';
import * as os from 'os'
import * as fsPromises from 'fs/promises';
import * as fs from 'fs';
import Logger from "./Logger";
import { GenerateRandomPort } from "./Port";
import DBDestroySignal from "./AbortSignal";
import { ExecuteReturn, InstalledMySQLVersion, InternalServerOptions, MySQLDB } from "../../types";
import {normalize as normalizePath, resolve as resolvePath} from 'path'
import { lockSync, unlockSync } from 'proper-lockfile';
import { waitForLock } from "./FileLock";

class Executor {
    logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger;
    }

    #execute(command: string): Promise<ExecuteReturn> {
        return new Promise(resolve => {
            exec(command, {signal: DBDestroySignal.signal}, (error, stdout, stderr) => {
                resolve({error, stdout, stderr})
            })
        })
    }

    #executeFile(command: string, args: string[], cwd: string): Promise<{stdout: string, stderr: string}> {
        return new Promise(resolve => {
            execFile(command, args, {signal: DBDestroySignal.signal, cwd}, (error, stdout, stderr) => {
                resolve({stdout, stderr: error?.message || stderr})
            })
        })
    }

    async #killProcess(process: ChildProcess): Promise<boolean> {
        let killed = false;
        if (os.platform() === 'win32') {
            const {error, stderr} = await this.#execute(`taskkill /pid ${process.pid} /t /f`)
            if (!error && !stderr) {
                killed = true;
            } else {
                this.logger.error(error || stderr)
            }
        } else {
            killed = process.kill()
        }
        return killed;
    }

    async deleteDatabaseDirectory(path: string): Promise<void> {
        let retries = 0;
        //Maximum wait of 10 seconds | 500ms * 20 retries = 10,000ms = 10 seconds
        const waitTime = 500;
        const maxRetries = 20;

        //Since the database processes are killed instantly (SIGKILL) sometimes the database file handles may still be open
        //This would cause an EBUSY error. Retrying the deletions for 10 seconds should give the OS enough time to close
        //the file handles.
        while (retries <= maxRetries) {
            try {
                await fsPromises.rm(path, {recursive: true, force: true})
                return
            } catch (e) {
                if (retries === maxRetries) {
                    throw e
                }
                await new Promise(resolve => setTimeout(resolve, waitTime))
                retries++
                this.logger.log('DB data directory deletion failed. Now on retry', retries)
            }
        }
    }

    #startMySQLProcess(options: InternalServerOptions, port: number, mySQLXPort: number, datadir: string, dbPath: string, binaryFilepath: string): Promise<MySQLDB> {
        const errors: string[] = []
        const logFile = `${dbPath}/log.log`
        const errorLogFile = `${datadir}/errorlog.err`

        return new Promise(async (resolve, reject) => {
            await fsPromises.rm(logFile, {force: true})

            const process = spawn(binaryFilepath, ['--no-defaults', `--port=${port}`, `--datadir=${datadir}`, `--mysqlx-port=${mySQLXPort}`, `--mysqlx-socket=${dbPath}/x.sock`, `--socket=${dbPath}/m.sock`, `--general-log-file=${logFile}`, '--general-log=1', `--init-file=${dbPath}/init.sql`, '--bind-address=127.0.0.1', '--innodb-doublewrite=OFF', '--mysqlx=FORCE', `--log-error=${errorLogFile}`], {signal: DBDestroySignal.signal, killSignal: 'SIGKILL'})

            //resolveFunction is the function that will be called to resolve the promise that stops the database.
            //If resolveFunction is not undefined, the database has received a kill signal and data cleanup procedures should run.
            //Once ran, resolveFunction will be called.
            let resolveFunction: () => void;

            process.on('close', async (code, signal) => {
                let errorLog: string;

                try {
                    errorLog = await fsPromises.readFile(errorLogFile, {encoding: 'utf-8'})
                } catch (e) {
                    errorLog = `ERROR WHILE READING LOG: ${e}`
                }

                const portIssue = errorLog.includes("Do you already have another mysqld server running")
                const xPortIssue = errorLog.includes("X Plugin can't bind to it")
                this.logger.log('Exiting because of a port issue:', portIssue, '. MySQL X Plugin failed to bind:', xPortIssue)

                if (portIssue || xPortIssue) {
                    this.logger.log('Error log when exiting for port in use error:', errorLog)
                    try {
                        await this.deleteDatabaseDirectory(options.dbPath)
                    } catch (e) {
                        this.logger.error(e)
                        return reject(`MySQL failed to listen on a certain port. To restart MySQL with a different port, the database directory needed to be deleted. An error occurred while deleting the database directory. Aborting. The error was: ${e}`)
                    }
                    return reject('Port is already in use')
                }

                try {
                    if (options.deleteDBAfterStopped) {
                        await this.deleteDatabaseDirectory(dbPath)
                    }
                } finally {
                    try {
                        if (binaryFilepath.includes(os.tmpdir()) && !options.downloadBinaryOnce) {
                            const splitPath = binaryFilepath.split(os.platform() === 'win32' ? '\\' : '/')
                            const binariesIndex = splitPath.indexOf('binaries')
                            //The path will be the directory path for the binary download
                            splitPath.splice(binariesIndex + 2)
                            //Delete the binary folder
                            await fsPromises.rm(splitPath.join('/'), {force: true, recursive: true})
                        }
                    } finally {
                        if (resolveFunction) {
                            resolveFunction()
                            return
                        }

                        const errorString = errors.join('\n')
                        
                        if (code === 0) {
                            return reject(`Database exited early.\nError log: ${errorLog}\nError string: "${errorString}`)
                        }
        
                        if (code) {
                            const errorMessage = `The database exited early with code ${code}. The error log was:\n${errorLog}\nThe error string was: "${errorString}".`
                            this.logger.error(errorMessage)
                            return reject(errorMessage)
                        }
                    }
                }
            })

            process.stderr.on('data', (data) => {
                if (!resolveFunction) {
                    if (Buffer.isBuffer(data)) {
                        errors.push(data.toString())
                    } else {
                        errors.push(data)
                    }
                }
            })

            fs.watchFile(errorLogFile, async (curr) => {
                if (curr.dev !== 0) {
                    //File exists
                    const file = await fsPromises.readFile(errorLogFile, {encoding: 'utf8'})
                    if (file.includes("X Plugin can't bind to it")) {
                        //As stated in the MySQL X Plugin documentation at https://dev.mysql.com/doc/refman/8.4/en/x-plugin-options-system-variables.html#sysvar_mysqlx_bind_address
                        //when the MySQL X Plugin fails to bind to an address, it does not prevent the MySQL server startup because MySQL X is not a mandatory plugin.
                        //It doesn't seem like there is a way to prevent server startup when that happens. The workaround to that is to shutdown the MySQL server ourselves when the X plugin
                        //cannot bind to an address. If there is a way to prevent server startup when binding fails, this workaround can be removed.
                        const killed = await this.#killProcess(process)
                        if (!killed) {
                            reject('Failed to kill MySQL process to retry listening on a free port.')
                        }
                    } else if (file.includes('ready for connections. Version:')) {
                        fs.unwatchFile(errorLogFile)
                        resolve({
                            port,
                            xPort: mySQLXPort,
                            dbName: options.dbName,
                            username: options.username,
                            stop: () => {
                                return new Promise(async (resolve, reject) => {
                                    resolveFunction = resolve;
                                   
                                    const killed = await this.#killProcess(process)
                                    
                                    if (!killed) {
                                       reject()
                                    }
                                })
                            }
                        })
                    }
                }
            })
        })
    }

    getMySQLVersion(preferredVersion?: string): Promise<InstalledMySQLVersion | null> {
        return new Promise(async (resolve, reject) => {
            if (process.platform === 'win32') {
                try {
                    const dirs = await fsPromises.readdir(`${process.env.PROGRAMFILES}\\MySQL`)
                    const servers = dirs.filter(dirname => dirname.includes('MySQL Server'))

                    if (servers.length === 0) {
                        return resolve(null)
                    }

                    this.logger.log(servers)

                    const versions: {version: string, path: string}[] = []

                    for (const dir of servers) {
                        const path = `${process.env.PROGRAMFILES}\\MySQL\\${dir}\\bin\\mysqld`
                        const {error, stdout, stderr} = await this.#execute(`"${path}" --version`)

                        if (error || stderr) {
                            return reject(error || stderr)
                        }

                        const verIndex = stdout.indexOf('Ver')

                        const version = coerce(stdout.slice(verIndex))
                        if (version === null) {
                            return reject('Could not get MySQL version')
                        } else {
                            versions.push({version: version.version, path})
                        }
                    }

                    if (preferredVersion) {
                        resolve(versions.find(version => satisfies(version.version, preferredVersion)) || null)
                    } else {
                        versions.sort()
                        resolve(versions[0])
                    }
                } catch (e) {
                    this.logger.error('Error occurred while getting installed MySQL version:', e)
                    resolve(null)
                }
            } else {
                const {error, stdout, stderr} = await this.#execute('mysqld --version')
                if (stderr && stderr.includes('not found')) {
                    resolve(null)
                } else if (error || stderr) {
                    reject(error || stderr)
                } else {
                    const version = coerce(stdout)
                    if (version === null) {
                        reject('Could not get installed MySQL version')
                    } else {
                        resolve({version: version.version, path: 'mysqld'})
                    }
                }
            }
        })
    }

    async #setupDataDirectories(options: InternalServerOptions, binaryFilepath: string, datadir: string, retry: boolean): Promise<void> {
        this.logger.log('Created data directory for database at:', datadir)
        await fsPromises.mkdir(datadir, {recursive: true})

        let stderr: string;

        if (binaryFilepath === 'mysqld') {
            const {error, stderr: output} = await this.#execute(`mysqld --no-defaults --datadir=${datadir} --initialize-insecure`)
            stderr = output
            if (error) {
                this.logger.error('An error occurred while initializing database with system-installed MySQL:', error)
                throw 'An error occurred while initializing database with system-installed MySQL. Please check the console for more information.'
            }
        } else {
            const result = await this.#executeFile(`${binaryFilepath}`, [`--no-defaults`, `--datadir=${datadir}`, `--initialize-insecure`], resolvePath(`${binaryFilepath}/..`))
            stderr = result.stderr
        }

        if (retry === false) {
            this.logger.warn('Retry is false and stderr is:', stderr)
            this.logger.warn(stderr && !stderr.includes('InnoDB initialization has ended'))
        }
            
        if (stderr && !stderr.includes('InnoDB initialization has ended')) {
            if (process.platform === 'win32' && stderr.includes('Command failed')) {
                this.logger.error(stderr)
                throw 'The mysqld command failed to run. A possible cause is that the Microsoft Visual C++ Redistributable Package is not installed. MySQL 5.7.40 and newer requires Microsoft Visual C++ Redistributable Package 2019 to be installed. Check the MySQL docs for Microsoft Visual C++ requirements for other MySQL versions. If you are sure you have this installed, check the error message in the console for more details.'
            }

            if (process.platform === 'linux' && stderr.includes('libaio.so')) {
                this.logger.error('An error occurred while initializing database:', stderr)
                if (binaryFilepath === 'mysqld') {
                    throw 'libaio could not be found while running system-installed MySQL. libaio must be installed on this system for MySQL to run. To learn more, please check out https://dev.mysql.com/doc/refman/en/binary-installation.html'
                }

                if (retry === false) {
                    throw 'Tried to copy libaio into lib folder and MySQL is still failing to initialize. Please check the console for more information.'
                }

                if (binaryFilepath.slice(-16) === 'mysql/bin/mysqld') {
                    const {error: lderror, stdout, stderr: ldstderr} = await this.#execute('ldconfig -p')
                    if (lderror || ldstderr) {
                        this.logger.error('The following libaio error occurred:', stderr)
                        this.logger.error('After the libaio error, an ldconfig error occurred:', lderror || ldstderr)
                        throw 'The ldconfig command failed to run. This command was ran to find libaio because libaio could not be found on the system. libaio is needed for MySQL to run. Do you have ldconfig and libaio installed? Learn more about libaio at Learn more at https://dev.mysql.com/doc/refman/en/binary-installation.html'
                    }
                    const libaioFound = stdout.split('\n').filter(lib => lib.includes('libaio.so.1t64'))
                    if (!libaioFound.length) {
                        this.logger.error('Error from launching MySQL:', stderr)
                        throw 'An error occurred while launching MySQL. The most likely cause is that libaio1 and libaio1t64 could not be found. Either libaio1 or libaio1t64 must be installed on this system for MySQL to run. To learn more, please check out https://dev.mysql.com/doc/refman/en/binary-installation.html. Check error in console for more information.'
                    }
                    const libaioEntry = libaioFound[0]
                    const libaioPathIndex = libaioEntry.indexOf('=>')
                    const libaioSymlinkPath = libaioEntry.slice(libaioPathIndex + 3)

                    const libaioPath = await fsPromises.realpath(libaioSymlinkPath)

                    const copyPath = resolvePath(`${binaryFilepath}/../../lib/private/libaio.so.1`)

                    try {
                        lockSync(copyPath, {realpath: false})

                        this.logger.log('libaio copy path:', copyPath, '| libaio symlink path:', libaioSymlinkPath, '| libaio actual path:', libaioPath)
                        let copyError: Error;

                        try {
                            await fsPromises.copyFile(libaioPath, copyPath)
                        } catch (e) {
                            copyError = e
                            this.logger.error('An error occurred while copying libaio1t64 to lib folder:', e)

                            try {
                                await fsPromises.rm(copyPath, {force: true})
                            } catch (e) {
                                this.logger.error('An error occurred while deleting libaio file:', e)
                            }
                        } finally {

                            try {
                                unlockSync(copyPath, {realpath: false})
                            } catch (e) {
                                this.logger.error('Error unlocking libaio file:', e)
                            }

                            if (copyError) {
                                throw 'An error occurred while copying libaio1t64 to the MySQL lib folder. Please check the console for more details.'
                            }

                            //Retry setting up directory now that libaio has been copied
                            this.logger.log('Retrying directory setup')
                            await this.deleteDatabaseDirectory(datadir)
                            await this.#setupDataDirectories(options, binaryFilepath, datadir, false)
                        }
                    } catch (error) {
                        if (String(error) === 'Error: Lock file is already being held') {
                            this.logger.log('Waiting for lock for libaio copy')
                            await waitForLock(copyPath, options)
                            this.logger.log('Lock is gone for libaio copy')
                        }
                        this.logger.error('An error occurred from locking libaio section:', error)
                        throw error
                    }
                } else {
                    throw 'Cannot recognize file structure for the MySQL binary folder. This was caused by not being able to find libaio. Try installing libaio. Learn more at https://dev.mysql.com/doc/refman/en/binary-installation.html'
                }
            }
            throw stderr
        }

        let initText = `CREATE DATABASE ${options.dbName};`;

        if (options.username !== 'root') {
            initText += `\nRENAME USER 'root'@'localhost' TO '${options.username}'@'localhost';`
        }

        await fsPromises.writeFile(`${options.dbPath}/init.sql`, initText, {encoding: 'utf8'})
    }

    async startMySQL(options: InternalServerOptions, binaryFilepath: string): Promise<MySQLDB> {
        let retries = 0;

        const datadir = normalizePath(`${options.dbPath}/data`)

        do {
            await this.#setupDataDirectories(options, binaryFilepath, datadir, true);

            const port = GenerateRandomPort()
            const mySQLXPort = GenerateRandomPort();
            this.logger.log('Using port:', port, 'and MySQLX port:', mySQLXPort, 'on retry:', retries)

            try {
                this.logger.log('Starting MySQL process')
                const resolved = await this.#startMySQLProcess(options, port, mySQLXPort, datadir, options.dbPath, binaryFilepath)
                this.logger.log('Starting process was successful')
                return resolved
            } catch (e) {
                this.logger.warn('Caught error:', e, `\nRetries: ${retries} | options.portRetries: ${options.portRetries}`)
                if (e !== 'Port is already in use') {
                    this.logger.error('Error:', e)
                    throw e
                }
                retries++
                if (retries <= options.portRetries) {
                    this.logger.warn(`One or both of these ports are already in use: ${port} or ${mySQLXPort}. Now retrying... ${retries}/${options.portRetries} possible retries.`)
                } else {
                    throw `The port has been retried ${options.portRetries} times and a free port could not be found.\nEither try again, or if this is a common issue, increase options.portRetries.`
                }
            }
        } while (retries <= options.portRetries)
    }
}

export default Executor