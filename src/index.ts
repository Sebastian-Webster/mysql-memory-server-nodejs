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
    logLevel: 'ERROR',
    portRetries: 10,
    downloadBinaryOnce: true
}

process.on('exit', () => {
    DBDestroySignal.abort('Process is exiting')
})

export async function createDB(opts: ServerOptions = defaultOptions) {
    const options: InternalServerOptions = {...defaultOptions, ...opts}

    const logger = new Logger(options.logLevel)

    const executor = new Executor(logger)

    const version = await executor.getMySQLVersion(options.version)
    logger.log('Version currently installed:', version)
    if (version === null || (options.version && !satisfies(version.version, options.version))) {
        let binaryURL: string;
        let binaryFilepath: string;
        try {
            binaryURL = getBinaryURL(MySQLVersions, options.version)
            logger.log('Downloading binary from url:', binaryURL)
        } catch (e) {
            logger.error(e)
            if (options.version) {
                throw `A MySQL version ${options.version} binary could not be found that supports your OS (${os.platform()} | ${os.version()}) and CPU architecture (${os.arch()}).`
            }
            throw `A MySQL binary could not be found that supports your OS (${os.platform()} | ${os.version()}) and CPU architecture (${os.arch()}).`
        }

        try {
            binaryFilepath = await downloadBinary(binaryURL, options, logger);
        } catch (error) {
            logger.error('Failed to download binary')
            throw error
        }

        logger.log('Running downloaded binary')
        return await executor.startMySQL(options, binaryFilepath)
    } else {
        logger.log(version)
        return await executor.startMySQL(options, version.path)
    }
}