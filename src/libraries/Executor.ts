import { ChildProcess, execFile, spawn } from "child_process"
import {coerce, gte, lt, lte, satisfies} from 'semver';
import * as os from 'os'
import * as fsPromises from 'fs/promises';
import * as fs from 'fs';
import Logger from "./Logger";
import { GenerateRandomPort } from "./Port";
import { ExecuteFileReturn, DownloadedMySQLVersion, InternalServerOptions, MySQLDB } from "../../types";
import {normalize as normalizePath, resolve as resolvePath} from 'path'
import { lockFile, waitForLock } from "./FileLock";
import { onExit } from "signal-exit";
import { randomUUID } from "crypto";
import { getInternalEnvVariable } from "../constants";
import etcOSRelease, { isOnAlpineLinux } from "./LinuxOSRelease";

class Executor {
    logger: Logger;
    DBDestroySignal = new AbortController();
    removeExitHandler: () => void;
    version: string;
    versionInstalledOnSystem: boolean;
    versionSupportsMySQLX: boolean;
    databasePath: string
    killedFromPortIssue: boolean;

    constructor(logger: Logger) {
        this.logger = logger;
    }

    #executeFile(command: string, args: string[]): Promise<ExecuteFileReturn> {
        return new Promise(resolve => {
            execFile(command, args, {signal: this.DBDestroySignal.signal}, (error, stdout, stderr) => {
                resolve({error, stdout, stderr})
            })
        })
    }

    async #killProcess(process: ChildProcess): Promise<boolean> {
        // If the process has already been killed, return true
        if (process.kill(0) === false) {
            this.logger.warn('Called #killProcess to kill mysqld but it has already been killed.')
            return true
        }

        return process.kill()
    }

    //Returns a path to the binary if it should be deleted
    //If it should not be deleted then it returns null
    #returnBinaryPathToDelete(binaryFilepath: string, options: InternalServerOptions): string | null {
        if (binaryFilepath.includes(os.tmpdir()) && !options.downloadBinaryOnce) {
            const splitPath = binaryFilepath.split(os.platform() === 'win32' ? '\\' : '/')
            const binariesIndex = splitPath.indexOf('binaries')
            //The path will be the directory path for the binary download
            splitPath.splice(binariesIndex + 2)
            return splitPath.join('/')
        }

        return null
    }

    #startMySQLProcess(options: InternalServerOptions, datadir: string, dbPath: string, binaryFilepath: string): Promise<MySQLDB> {
        const errors: string[] = []
        const logFile = `${dbPath}/log.log`
        const errorLogFile = `${datadir}/errorlog.err`

        const port = options.port || GenerateRandomPort()
        const mySQLXPort = options.xPort || GenerateRandomPort();

        return new Promise(async (resolve, reject) => {
            await fsPromises.rm(logFile, {force: true})

            const socket = os.platform() === 'win32' ? `MySQL-${randomUUID()}` : `${dbPath}/m.sock`
            const xSocket = os.platform() === 'win32' ? `MySQLX-${randomUUID()}` : `${dbPath}/x.sock`

            const mysqlArguments = [
                '--no-defaults',
                `--port=${port}`,
                `--datadir=${datadir}`,
                `--socket=${socket}`,
                `--general-log-file=${logFile}`,
                '--general-log=1',
                `--init-file=${dbPath}/init.sql`,
                '--bind-address=127.0.0.1',
                '--innodb-doublewrite=OFF',
                `--log-error=${errorLogFile}`,
                `--user=${os.userInfo().username}`
            ]

            if (this.versionSupportsMySQLX) {
                mysqlArguments.push(`--mysqlx=${options.xEnabled}`)
            }

            if (options.xEnabled !== 'OFF') {
                mysqlArguments.push(`--mysqlx-port=${mySQLXPort}`)
                mysqlArguments.push(`--mysqlx-socket=${xSocket}`)

                //<8.0.11 does not have MySQL X turned on by default so we will be installing the X Plugin in this if statement.
                //MySQL 5.7.12 introduced the X plugin, but according to https://dev.mysql.com/doc/refman/5.7/en/document-store-setting-up.html, the database needs to be initialised with version 5.7.19.
                //If the MySQL version is >=5.7.19 & <8.0.11 then install the X Plugin
                if (lt(this.version, '8.0.11') && gte(this.version, '5.7.19')) {
                    const pluginExtension = os.platform() === 'win32' ? 'dll' : 'so';
                    let pluginPath: string;
                    const firstPath = resolvePath(`${binaryFilepath}/../../lib/plugin`)
                    const secondPath = '/usr/lib/mysql/plugin'

                    if (fs.existsSync(`${firstPath}/mysqlx.${pluginExtension}`)) {
                        pluginPath = firstPath
                    } else if (os.platform() === 'linux' && fs.existsSync(`${secondPath}/mysqlx.so`)) {
                        pluginPath = secondPath
                    } else {
                        throw 'Could not install MySQL X as the path to the plugin cannot be found.'
                    }
                    mysqlArguments.splice(1, 0, `--plugin-dir=${pluginPath}`, `--early-plugin-load=mysqlx=mysqlx.${pluginExtension};`)
                }
            }

            const process = spawn(binaryFilepath, mysqlArguments, {signal: this.DBDestroySignal.signal, killSignal: 'SIGKILL'})

            //resolveFunction is the function that will be called to resolve the promise that stops the database.
            //If resolveFunction is not undefined, the database has received a kill signal and data cleanup procedures should run.
            //Once ran, resolveFunction will be called.
            let resolveFunction: () => void;

            process.on('close', async (code, signal) => {
                // Prevent open file watches when MySQL has been exited
                // The file watch is only stopped if MySQL starts successfully
                // This unwatch will prevent the watch from watching when the process has stopped.
                fs.unwatchFile(errorLogFile)

                if (signal) {
                    this.logger.log('Exiting because the process received a signal:', signal)

                    if (getInternalEnvVariable('deleteDBAfterStopped') === 'true') {
                        try {
                            await fsPromises.rm(dbPath, {recursive: true, force: true, maxRetries: 50, retryDelay: 100})
                        } catch (e) {
                            this.logger.error('An error occurred while deleting database path after aborted signal. The error was:', e)
                        }
                    }

                    const binaryPathToDelete = this.#returnBinaryPathToDelete(binaryFilepath, options)
                    if (binaryPathToDelete) {
                        try {
                            await fsPromises.rm(binaryPathToDelete, {force: true, recursive: true, maxRetries: 50})
                        } catch (e) {
                            this.logger.error('An error occurred while deleting database binary after aborted signal. The error was:', e)
                        }
                    }

                    if (resolveFunction) {
                        resolveFunction()
                    }

                    return
                }

                let errorLog: string;

                try {
                    errorLog = await fsPromises.readFile(errorLogFile, {encoding: 'utf-8'})
                } catch (e) {
                    errorLog = `ERROR WHILE READING LOG: ${e}`
                }

                if (!this.killedFromPortIssue) {
                    //A check is done after the error log file says that the server is ready for connections.
                    //When MySQL X cannot bind to a port, the server still says it is ready for connections so killedFromPortIssue gets set to true
                    //This if statement will be ran if the server did not encounter a port issue or if the MySQL server could not bind to its port
                    this.killedFromPortIssue = errorLog.includes("Do you already have another mysqld server running")
                    this.logger.log('Did a port issue occur between server start and server close:', this.killedFromPortIssue)
                }

                if (this.killedFromPortIssue) {
                    this.logger.log('Error log when exiting for port in use error:', errorLog)
                    try {
                        this.logger.log('Deleting database path after port issue...')
                        await fsPromises.rm(dbPath, {recursive: true, force: true, maxRetries: 50, retryDelay: 100})
                        this.logger.log('Successfully deleted database after port issue.')
                    } catch (e) {
                        this.logger.error(e)
                        return reject(`MySQL failed to listen on a certain port. To restart MySQL with a different port, the database directory needed to be deleted. An error occurred while deleting the database directory. Aborting. The error was: ${e}`)
                    }
                    return reject('Port is already in use')
                }

                try {
                    if (getInternalEnvVariable('deleteDBAfterStopped') === 'true') {
                        await fsPromises.rm(dbPath, {recursive: true, force: true, maxRetries: 50, retryDelay: 100})
                    }
                } catch (e) {
                    this.logger.error('An error occurred while deleting database directory at path:', dbPath, '| The error was:', e)  
                } finally {
                    try {
                        const binaryPathToDelete = this.#returnBinaryPathToDelete(binaryFilepath, options)
                        if (binaryPathToDelete) {
                            await fsPromises.rm(binaryPathToDelete, {force: true, recursive: true, maxRetries: 50})
                        }
                    } catch (e) {
                        this.logger.error('An error occurred while deleting no longer needed MySQL binary:', e)  
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
                if (curr.isFile()) {
                    //File exists
                    const file = await fsPromises.readFile(errorLogFile, {encoding: 'utf8'})
                    if (file.includes(': ready for connections') || file.includes('Server starts handling incoming connections')) {
                        fs.unwatchFile(errorLogFile)

                        this.killedFromPortIssue = file.includes("Do you already have another mysqld server running")
                        this.logger.log('Did a port issue occur after watching errorLogFile:', this.killedFromPortIssue)
                        if (this.killedFromPortIssue) {
                            const killed = await this.#killProcess(process)
                            if (!killed) {
                                return reject('Failed to kill process after port error.')
                            }
                            return //Promise rejection will be handled in the process.on('close') section because this.killedFromPortIssue is being set to true
                        }

                        const result: MySQLDB = {
                            port,
                            xPort: options.xEnabled === 'FORCE' ? mySQLXPort : -1,
                            socket,
                            xSocket: options.xEnabled === 'FORCE' ? xSocket : '',
                            dbName: options.dbName,
                            username: options.username,
                            mysql: {
                                version: this.version,
                                versionIsInstalledOnSystem: this.versionInstalledOnSystem
                            },
                            stop: () => {
                                return new Promise(async (resolve, reject) => {
                                    resolveFunction = resolve;

                                    this.removeExitHandler()
                                   
                                    const killed = await this.#killProcess(process)
                                    
                                    if (!killed) {
                                       reject('Failed to kill process.')
                                    }
                                })
                            }
                        }

                        resolve(result)
                    }
                }
            })
        })
    }

    getMySQLVersion(preferredVersion?: string): Promise<DownloadedMySQLVersion | null> {
        return new Promise(async (resolve, reject) => {
            if (process.platform === 'win32') {
                try {
                    let dirs: String[];
                    try {
                        dirs = await fsPromises.readdir(`${process.env.PROGRAMFILES}\\MySQL`)
                    } catch (e) {
                        if (e?.code === 'ENOENT') {
                            return resolve(null)
                        } else {
                            throw e
                        }
                    }
                    const servers = dirs.filter(dirname => dirname.includes('MySQL Server'))

                    if (servers.length === 0) {
                        return resolve(null)
                    }

                    this.logger.log(servers)

                    const versions: DownloadedMySQLVersion[] = []

                    for (const dir of servers) {
                        const path = `${process.env.PROGRAMFILES}\\MySQL\\${dir}\\bin\\mysqld`
                        const {error, stdout, stderr} = await this.#executeFile(path, ['--version'])

                        if (error || stderr) {
                            return reject(error || stderr)
                        }

                        const verIndex = stdout.indexOf('Ver')

                        const version = coerce(stdout.slice(verIndex))
                        if (version === null) {
                            return reject('Could not get MySQL version')
                        } else {
                            versions.push({version: version.version, path, installedOnSystem: true, xPluginSupported: gte(version, '5.7.19')})
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
                const {error, stdout, stderr} = await this.#executeFile('mysqld', ['--version'])
                if (error && error.code === 'ENOENT') {
                    resolve(null)
                } else if (error || stderr) {
                    reject(error || stderr)
                } else {
                    const version = coerce(stdout)
                    if (version === null) {
                        reject('Could not get installed MySQL version')
                    } else {
                        resolve({version: version.version, path: 'mysqld', installedOnSystem: true, xPluginSupported: gte(version, '5.7.19')})
                    }
                }
            }
        })
    }

    async #setupDataDirectories(options: InternalServerOptions, binary: DownloadedMySQLVersion, datadir: string, retry: boolean): Promise<void> {
        const binaryFilepath = binary.path
        this.logger.log('Created data directory for database at:', datadir)
        await fsPromises.mkdir(datadir, {recursive: true})

        const {error, stderr} = await this.#executeFile(binaryFilepath, ['--no-defaults', `--datadir=${datadir}`, '--initialize-insecure'])

        if (binary.installedOnSystem && error) {
            this.logger.error('An error occurred while initializing database with the system-installed MySQL binary:', error)
            throw `An error occurred while initializing the MySQL database: ${error}`
        }
            
        if (stderr && !stderr.includes('is created with an empty password')) {
            if (process.platform === 'win32' && stderr.includes('Command failed')) {
                this.logger.error(stderr)
                throw 'The mysqld command failed to run. A possible cause is that the Microsoft Visual C++ Redistributable Package is not installed. MySQL 5.7.40 and newer requires Microsoft Visual C++ Redistributable Package 2019 to be installed. Check the MySQL docs for Microsoft Visual C++ requirements for other MySQL versions. If you are sure you have this installed, check the error message in the console for more details.'
            }

            if (process.platform === 'linux' && stderr.includes('libaio.so')) {
                if (retry === false) {
                    this.logger.error('An error occurred while initializing database:', stderr)
                    throw 'Tried to copy libaio into lib folder and MySQL is still failing to initialize. Please check the console for more information.'
                }

                if (binary.installedOnSystem) {
                    throw 'libaio could not be found while running system-installed MySQL. libaio must be installed on this system for MySQL to run. To learn more, please check out https://dev.mysql.com/doc/refman/en/binary-installation.html'
                }

                // If the below code is running, the version of MySQL that is trying to be executed was downloaded from the CDN by this package and libaio has not yet been attempted to be copied

                if (etcOSRelease.NAME === 'Ubuntu' && etcOSRelease.VERSION_ID >= '24.04') {
                    const {error: lderror, stdout, stderr: ldstderr} = await this.#executeFile('ldconfig', ['-p'])
                    if (lderror || ldstderr) {
                        this.logger.error('The following libaio error occurred:', stderr)
                        this.logger.error('After the libaio error, an ldconfig error occurred:', lderror || ldstderr)
                        throw 'The ldconfig command failed to run. This command was ran to find libaio1t64 because libaio1t64 could not be found on the system. libaio1t64 is needed for MySQL to run. Do you have ldconfig and libaio1t64 installed? Learn more at https://dev.mysql.com/doc/refman/en/binary-installation.html'
                    }
                    const libaioFound = stdout.split('\n').filter(lib => lib.includes('libaio.so.1t64'))
                    if (!libaioFound.length) {
                        this.logger.error('Error from launching MySQL:', stderr)
                        this.logger.error('Could not find libaio1t64 in this list:', libaioFound)
                        throw 'An error occurred while launching MySQL because libaio1t64 is not installed on your system. Please install libaio1t64 and then use mysql-memory-server again. To learn more, please check out https://dev.mysql.com/doc/refman/en/binary-installation.html. Check error in console for more information.'
                    }
                    const libaioEntry = libaioFound[0]
                    const libaioPathIndex = libaioEntry.indexOf('=>')
                    const libaioSymlinkPath = libaioEntry.slice(libaioPathIndex + 3)

                    const libaioPath = await fsPromises.realpath(libaioSymlinkPath)

                    let copyPath: string;

                    if (lt(this.version, '8.0.18')) {
                        copyPath = resolvePath(`${binaryFilepath}/../../bin/libaio.so.1`)
                    } else {
                        copyPath = resolvePath(`${binaryFilepath}/../../lib/private/libaio.so.1`)
                    }

                    let lockRelease: () => Promise<void>;

                    while(true) {
                        try {
                            lockRelease = await lockFile(copyPath)
                            break
                        } catch (e) {
                            if (e === 'LOCKED') {
                                this.logger.log('Waiting for lock for libaio copy')
                                await waitForLock(copyPath, options)
                                this.logger.log('Lock is gone for libaio copy')

                                //If libaio does not exist after the lock has been released (like if the copy fails)
                                //then the lock acquisition process should start again
                                const binaryExists = fs.existsSync(copyPath)
                                if (!binaryExists) continue

                                break
                            } else {
                                this.logger.error('An error occurred from locking libaio section:', e)
                                throw e
                            }
                        }
                    }

                    if (lockRelease) {
                        //This code will only run if the lock has been acquired successfully.
                        //If the lock was already acquired by some other process, this process would have already waited for the lock, so no copying needs to be done since it's already happened.
                        //If the lock failed to acquire for some other reason, the error would've already been thrown.
                        
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
                                await lockRelease()
                            } catch (e) {
                                this.logger.error('Error unlocking libaio file:', e)
                            }

                            if (copyError) {
                                throw 'An error occurred while copying libaio1t64 to the MySQL lib folder. Please check the console for more details.'
                            }
                        }
                    }

                    //Retry setting up directory now that libaio has been copied
                    this.logger.log('Retrying directory setup')
                    await fsPromises.rm(datadir, {recursive: true, force: true, maxRetries: 50, retryDelay: 100})
                    await this.#setupDataDirectories(options, binary, datadir, false)
                    return
                }

                throw 'You do not have libaio1 installed. Please install the libaio1 package for the downloaded MySQL binary to run. Learn more here: https://dev.mysql.com/doc/refman/en/binary-installation.html'
            }
            throw stderr
        }

        this.logger.log('Creating init text')

        let initText = `CREATE DATABASE ${options.dbName};`;

        if (options.username !== 'root') {
            initText += `\nCREATE USER '${options.username}'@'localhost';\nGRANT ALL ON *.* TO '${options.username}'@'localhost' WITH GRANT OPTION;`
        }

        if (options.initSQLString.length > 0) {
            initText += `\n${options.initSQLString}`
        }

        this.logger.log('Writing init file')

        await fsPromises.writeFile(`${this.databasePath}/init.sql`, initText, {encoding: 'utf8'})

        this.logger.log('Finished writing init file')
    }

    async startMySQL(options: InternalServerOptions, installedMySQLBinary: DownloadedMySQLVersion): Promise<MySQLDB> {
        if (installedMySQLBinary.xPluginSupported === false && options.xEnabled === 'FORCE') {
            if (isOnAlpineLinux) {
                throw "options.xEnabled is set to 'FORCE'. You are running this package on Alpine Linux. The MySQL binaries for Alpine Linux do not support the MySQL X Plugin. If you don't want to use the MySQL X Plugin, please set options.xEnabled to 'OFF' and that will remove this error message. If you must have MySQL X enabled for each database creation, please use a different OS to run this package."
            }
            throw "options.xEnabled is set to 'FORCE'. The version of MySQL you are using does not support MySQL X. If you don't want to use the MySQL X Plugin, please set options.xEnabled to 'OFF'. Otherwise, if MySQL X is required, please use a different version of MySQL that supports the X plugin."
        }

        this.version = installedMySQLBinary.version
        this.versionInstalledOnSystem = installedMySQLBinary.installedOnSystem
        this.versionSupportsMySQLX = installedMySQLBinary.xPluginSupported
        this.removeExitHandler = onExit(() => {
            if (getInternalEnvVariable('cli') === 'true') {
                console.log('\nShutting down the ephemeral MySQL database and cleaning all related files...')
            }

            this.DBDestroySignal.abort()

            if (getInternalEnvVariable('deleteDBAfterStopped') === 'true') {
                try {
                    fs.rmSync(this.databasePath, {recursive: true, maxRetries: 50, force: true})
                } catch (e) {
                    this.logger.error('An error occurred while deleting database directory path:', e)
                }
            }

            const binaryPathToDelete = this.#returnBinaryPathToDelete(installedMySQLBinary.path, options)
            if (binaryPathToDelete) {
                try {
                    fs.rmSync(binaryPathToDelete, {force: true, recursive: true, maxRetries: 50})
                } catch (e) {
                    this.logger.error('An error occurred while deleting database binary:', e)
                }
            }

            if (getInternalEnvVariable('cli') === 'true') {
                console.log('Shutdown and cleanup is complete.')
            }
        })

        let retries = 0;

        this.databasePath = normalizePath(`${getInternalEnvVariable('databaseDirectoryPath')}/${randomUUID().replaceAll("-", '')}`)

        const datadir = normalizePath(`${this.databasePath}/data`)

        do {
            await this.#setupDataDirectories(options, installedMySQLBinary, datadir, true);
            this.logger.log('Setting up directories was successful')

            try {
                this.logger.log('Starting MySQL process')
                const resolved = await this.#startMySQLProcess(options, datadir, this.databasePath, installedMySQLBinary.path)
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
                    this.logger.warn(`Tried a port that is already in use. Now retrying... ${retries}/${options.portRetries} possible retries.`)
                } else {
                    throw `The port has been retried ${options.portRetries} times and a free port could not be found.\nEither try again, or if this is a common issue, increase options.portRetries.`
                }
            }
        } while (retries <= options.portRetries)
    }
}

export default Executor