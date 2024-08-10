import { exec, spawn } from "child_process"
import {coerce, satisfies} from 'semver';
import * as os from 'os'
import * as fsPromises from 'fs/promises';
import * as fs from 'fs';
import Logger from "./Logger";
import { GenerateRandomPort } from "./Port";
import DBDestroySignal from "./AbortSignal";
import { ExecuteReturn, InstalledMySQLVersion, InternalServerOptions, MySQLDB } from "../../types";
import {normalize as normalizePath} from 'path'

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

    #startMySQLProcess(options: InternalServerOptions, port: number, mySQLXPort: number, datadir: string, dbPath: string, binaryFilepath: string): Promise<MySQLDB> {
        const errors: string[] = []
        const logFile = `${dbPath}/log.log`
        const errorLogFile = `${datadir}/errorlog.err`

        return new Promise(async (resolve, reject) => {
            await fsPromises.rm(logFile, {force: true})

            const process = spawn(binaryFilepath, ['--no-defaults', `--port=${port}`, `--datadir=${datadir}`, `--mysqlx-port=${mySQLXPort}`, `--mysqlx-socket=${dbPath}/x.sock`, `--socket=${dbPath}/m.sock`, `--general-log-file=${logFile}`, '--general-log=1', `--init-file=${dbPath}/init.sql`, '--bind-address=127.0.0.1', '--innodb-doublewrite=OFF', `--log-error=${errorLogFile}`], {signal: DBDestroySignal.signal, killSignal: 'SIGKILL'})

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
                this.logger.log('Exiting because of port issue:', portIssue)

                if (portIssue) {
                    return reject('Port is already in use')
                }

                try {
                    if (options.deleteDBAfterStopped) {
                        await fsPromises.rm(dbPath, {recursive: true, force: true})
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
                    if (file.includes('ready for connections. Version:')) {
                        fs.unwatchFile(errorLogFile)
                        resolve({
                            port,
                            xPort: mySQLXPort,
                            dbName: options.dbName,
                            username: options.username,
                            stop: () => {
                                return new Promise(async (resolve, reject) => {
                                    resolveFunction = resolve;
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

    startMySQL(options: InternalServerOptions, binaryFilepath: string): Promise<MySQLDB> {
        return new Promise(async (resolve, reject) => {
            const datadir = normalizePath(`${options.dbPath}/data`)

            this.logger.log('Created data directory for database at:', datadir)
            await fsPromises.mkdir(datadir, {recursive: true})

            const {error: err, stderr}  = await this.#execute(`"${binaryFilepath}" --no-defaults --datadir=${datadir} --initialize-insecure`)
            
            if (err || (stderr && !stderr.includes('InnoDB initialization has ended'))) {
                if (process.platform === 'win32' && (err?.message.includes('Command failed') || stderr.includes('Command failed'))) {
                    this.logger.error(err || stderr)
                    return reject('The mysqld command failed to run. A possible cause is that the Microsoft Visual C++ Redistributable Package is not installed. MySQL 5.7.40 and newer requires Microsoft Visual C++ Redistributable Package 2019 to be installed. Check the MySQL docs for Microsoft Visual C++ requirements for other MySQL versions. If you are sure you have this installed, check the error message in the console for more details.')
                }

                if (process.platform === 'linux' && (err?.message.includes('libaio.so') || stderr.includes('libaio.so'))) {
                    this.logger.error(err || stderr)
                    return reject('The mysqld command failed to run. MySQL needs the libaio package installed on Linux systems to run. Do you have this installed? Learn more at https://dev.mysql.com/doc/refman/en/binary-installation.html')
                }
                return reject(err || stderr)
            }

            let initText = `CREATE DATABASE ${options.dbName};`;

            if (options.username !== 'root') {
                initText += `RENAME USER 'root'@'localhost' TO '${options.username}'@'localhost';`
            }

            await fsPromises.writeFile(`${options.dbPath}/init.sql`, initText, {encoding: 'utf8'})

            let retries = 0;

            do {
                const port = GenerateRandomPort()
                const mySQLXPort = GenerateRandomPort();
                this.logger.log('Using port:', port, 'and MySQLX port:', mySQLXPort, 'on retry:', retries)

                try {
                    this.logger.log('Starting MySQL process')
                    const resolved = await this.#startMySQLProcess(options, port, mySQLXPort, datadir, options.dbPath, binaryFilepath)
                    this.logger.log('Starting process was successful')
                    return resolve(resolved)
                } catch (e) {
                    this.logger.error('Caught error:', e, `\nRetries: ${retries} | options.portRetries: ${options.portRetries}`)
                    if (e !== 'Port is already in use') {
                        this.logger.error('Error:', e)
                        return reject(e)
                    }
                    retries++
                    if (retries < options.portRetries) {
                        this.logger.warn(`One or both of these ports are already in use: ${port} or ${mySQLXPort}. Now retrying... ${retries}/${options.portRetries} possible retries.`)
                    }
                }
            } while (retries < options.portRetries)

            reject(`The port has been retried ${options.portRetries} times and a free port could not be found.\nEither try again, or if this is a common issue, increase options.portRetries.`)
        })
    }
}

export default Executor
