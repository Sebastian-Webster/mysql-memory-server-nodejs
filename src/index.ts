import Logger from './libraries/Logger'
import * as os from 'node:os'
import Executor from "./libraries/Executor"
import { satisfies } from "semver"
import DBDestroySignal from "./libraries/AbortSignal"
import { InternalServerOptions, ServerOptions } from '../types'
import getBinaryURL from './libraries/Version'
import MySQLVersions from './versions.json'
import { downloadBinary } from './libraries/Downloader'

const defaultOptions: InternalServerOptions = {
    dbName: 'dbdata',
    logLevel: 'LOG'
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
        let binaryURL: string;
        let binaryFilepath: string;
        try {
            binaryURL = getBinaryURL(MySQLVersions, options.version)
            logger.log('Downloading binary from url:', binaryURL)
        } catch (e) {
            logger.error(e)
            throw 'Downloading updated versions list is coming soon'
        }

        try {
            binaryFilepath = await downloadBinary(binaryURL, logger);
        } catch (error) {
            logger.error('Failed to download binary')
            throw error
        }

        logger.log('Running downloaded binary')
        return await executor.startMySQL(options, binaryFilepath)
    } else {
        logger.log(version)
        return await executor.startMySQL(options)
    }
}