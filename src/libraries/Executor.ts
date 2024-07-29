import { exec, spawn } from "child_process"
import {coerce} from 'semver';
import {v4 as uuidv4} from 'uuid'
import * as os from 'os'
import * as fsPromises from 'fs/promises';
import * as fs from 'fs';
import Logger from "./Logger";
import { GenerateRandomPort } from "./Port";
import DBDestroySignal from "./AbortSignal";
import { ExecuteReturn, MySQLDB, ServerOptions } from "../../types";

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

    startMySQL(options: ServerOptions, binaryFilepath?: string): Promise<MySQLDB> {
        return new Promise(async (resolve, reject) => {
            //mysqlmsn = MySQL Memory Server Node.js
            const dbPath = `${os.tmpdir()}/mysqlmsn/dbs/${uuidv4().replace(/-/g, '')}`
            const datadir = `${dbPath}/data`

            this.logger.log('Created data directory for database at:', datadir)
            await fsPromises.mkdir(datadir, {recursive: true})

            let killing = false;
            

            const {error: err, stderr}  = await this.#execute(`${binaryFilepath || 'mysqld'} --datadir=${datadir} --initialize-insecure`)
            
            if (err || (stderr && !stderr.includes('InnoDB initialization has ended'))) {
                return reject(err || stderr)
            }

            const port = GenerateRandomPort()
            const mySQLXPort = GenerateRandomPort();
            this.logger.log('Using port:', port)

            await fsPromises.writeFile(`${dbPath}/init.sql`, `CREATE DATABASE ${options.dbName};`, {encoding: 'utf8'})

            const errors: string[] = []
            const logFile = `${dbPath}/log.log`
            const process = spawn(binaryFilepath || 'mysqld', [`--port=${port}`, `--datadir=${datadir}`, `--mysqlx-port=${mySQLXPort}`, `--mysqlx-socket=${dbPath}/x.sock`, `--socket=${dbPath}/m.sock`, `--general-log-file=${logFile}`, '--general-log=1', `--init-file=${dbPath}/init.sql`], {signal: DBDestroySignal.signal})

            process.on('close', (code, signal) => {
                if (code === 0) {
                    if (killing) return
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
                                    const killed = process.kill();
                                    
                                    if (killed) {
                                        try {
                                            const splitPath = binaryFilepath.split('/')
                                            const binariesIndex = splitPath.indexOf('binaries')
                                            //The path will be the directory path for the binary download
                                            splitPath.splice(binariesIndex + 2)
                                            //Delete the binary folder
                                            await fsPromises.rm(splitPath.join('/'), {force: true, recursive: true})
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
}

export default Executor