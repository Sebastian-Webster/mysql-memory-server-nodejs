import Logger from './libraries/Logger'
import * as os from 'node:os'
import Executor from "./libraries/Executor"
import { satisfies } from "semver"
import DBDestroySignal from "./libraries/AbortSignal"
import { InternalServerOptions, ServerOptions } from '../types'

const defaultOptions: InternalServerOptions = {
    dbName: 'dbdata',
    logLevel: 'ERROR'
}

process.on('exit', () => {
    console.log('Process is exiting')
    DBDestroySignal.abort('Process is exiting')
})

export async function createDB(opts: ServerOptions = defaultOptions) {
    const options: InternalServerOptions = {...defaultOptions, ...opts}

    const logger = new Logger(options.logLevel)

    const executor = new Executor(logger)

    logger.log('Data:', options.version, os.platform(), os.release(), os.arch())
    const version = await executor.getMySQLVersion()
    if (version === null || (options.version && !satisfies(version, options.version))) {
        throw 'Desired version of mysqld is not installed. Support for downloading MySQL is coming soon.'
    } else {
        logger.log(version)
        return await executor.startMySQL(options)
    }
}