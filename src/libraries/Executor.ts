import { exec, spawn } from "child_process"
import {coerce} from 'semver';
import {v4 as uuidv4} from 'uuid'
import * as os from 'os'
import * as fsPromises from 'fs/promises';
import * as fs from 'fs';
import Logger from "./Logger";
import { GenerateRandomPort } from "./Port";
import DBDestroySignal from "./AbortSignal";
import { ExecuteReturn, InternalServerOptions, MySQLDB } from "../../types";

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

    #startMySQLProcess(options: InternalServerOptions, port: number, mySQLXPort: number, datadir: string, dbPath: string, binaryFilepath?: string): Promise<MySQLDB> {
        let killing = false;
        const errors: string[] = []
        const logFile = `${dbPath}/log.log`

        return new Promise(async (resolve, reject) => {
            await fsPromises.rm(logFile, {force: true})

            const process = spawn(binaryFilepath || 'mysqld', [`--port=${port}`, `--datadir=${datadir}`, `--mysqlx-port=${mySQLXPort}`, `--mysqlx-socket=${dbPath}/x.sock`, `--socket=${dbPath}/m.sock`, `--general-log-file=${logFile}`, '--general-log=1', `--init-file=${dbPath}/init.sql`], {signal: DBDestroySignal.signal, killSignal: 'SIGKILL'})

            process.on('close', (code, signal) => {
                if (killing) return
                
                if (code === 0) {
                    return reject('Database exited early')
                }

                const errorString = errors.join('\n')
                this.logger.error(errorString)
                if (errorString.includes('Address already in use')) {
                    return reject('Port is already in use')
                }

                if (code) {
                    return reject(errorString)
                }
            })

            process.stderr.on('data', (data) => {
                if (!killing) {
                    if (Buffer.isBuffer(data)) {
                        errors.push(data.toString())
                    } else {
                        errors.push(data)
                    }
                }
            })

            fs.watchFile(logFile, async (curr) => {
                if (curr.dev !== 0) {
                    //File exists
                    const file = await fsPromises.readFile(logFile, {encoding: 'utf8'})
                    if (file.includes('started with:')) {
                        fs.unwatchFile(logFile)
                        resolve({
                            port,
                            xPort: mySQLXPort,
                            dbName: options.dbName,
                            stop: () => {
                                return new Promise(async (resolve, reject) => {
                                    killing = true
                                    const killed = process.kill('SIGKILL');
                                    
                                    if (killed) {
                                        try {
                                            const splitPath = binaryFilepath.split('/')
                                            const binariesIndex = splitPath.indexOf('binaries')
                                            //The path will be the directory path for the binary download
                                            splitPath.splice(binariesIndex + 2)
                                            //Delete the binary folder
                                            await Promise.all([
                                                fsPromises.rm(splitPath.join('/'), {force: true, recursive: true}),
                                                fsPromises.rm(dbPath, {force: true, recursive: true})
                                            ])
                                        } finally {
                                            resolve()
                                        }
                                    }
                                    else reject()
                                })
                            }
                        })
                    }
                }
            })
        })
    }

    getMySQLVersion(): Promise<string | null> {
        return new Promise(async (resolve, reject) => {
            const {error, stdout, stderr} = await this.#execute('mysqld --version')
            if (stderr && stderr.includes('command not found')) {
                resolve(null)
            } else if (error || stderr) {
                reject(error || stderr)
            } else {
                const version = coerce(stdout)
                if (version === null) {
                    reject('Could not get installed MySQL version')
                } else {
                    resolve(version.version)
                }
            }
        })
    }

    startMySQL(options: InternalServerOptions, binaryFilepath?: string): Promise<MySQLDB> {
        return new Promise(async (resolve, reject) => {
            //mysqlmsn = MySQL Memory Server Node.js
            const dbPath = `${os.tmpdir()}/mysqlmsn/dbs/${uuidv4().replace(/-/g, '')}`
            const datadir = `${dbPath}/data`

            this.logger.log('Created data directory for database at:', datadir)
            await fsPromises.mkdir(datadir, {recursive: true})
            

            const {error: err, stderr}  = await this.#execute(`${binaryFilepath || 'mysqld'} --datadir=${datadir} --initialize-insecure`)
            
            if (err || (stderr && !stderr.includes('InnoDB initialization has ended'))) {
                return reject(err || stderr)
            }

            await fsPromises.writeFile(`${dbPath}/init.sql`, `CREATE DATABASE ${options.dbName};`, {encoding: 'utf8'})

            let retries = 0;

            do {
                const port = GenerateRandomPort()
                const mySQLXPort = GenerateRandomPort();
                this.logger.log('Using port:', port, 'on retry:', retries)

                try {
                    const resolved = await this.#startMySQLProcess(options, port, mySQLXPort, datadir, dbPath, binaryFilepath)
                    return resolve(resolved)
                } catch (e) {
                    if (e !== 'Port is already in use') {
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