import Logger from './libraries/Logger'
import * as os from 'node:os'
import Executor from "./libraries/Executor"
import { satisfies, lt, coerce } from "semver"
import { BinaryInfo, ServerOptions } from '../types'
import getBinaryURL from './libraries/Version'
import { downloadBinary } from './libraries/Downloader'
import { MIN_SUPPORTED_MYSQL, DEFAULT_OPTIONS_KEYS, OPTION_TYPE_CHECKS, DEFAULT_OPTIONS_GENERATOR } from './constants'

export async function createDB(opts?: ServerOptions) {
    const suppliedOpts = opts || {};
    const suppliedOptsKeys = Object.keys(suppliedOpts);

    const options = DEFAULT_OPTIONS_GENERATOR();
    
    for (const opt of suppliedOptsKeys) {
        if (!DEFAULT_OPTIONS_KEYS.includes(opt)) {
            throw `Option ${opt} is not a valid option.`
        }

        if (!OPTION_TYPE_CHECKS[opt].check(suppliedOpts[opt])) {
            //Supplied option failed the check
            throw `${OPTION_TYPE_CHECKS[opt].errorMessage} | Received value: ${suppliedOpts[opt]} (type: ${typeof suppliedOpts[opt]})`
        }

        if (suppliedOpts[opt] !== undefined) {
            options[opt] = suppliedOpts[opt]
        }
    }

    const logger = new Logger(options.logLevel)

    const executor = new Executor(logger)

    const version = await executor.getMySQLVersion(options.version)

    const unsupportedMySQLIsInstalled = version && lt(version.version, MIN_SUPPORTED_MYSQL)

    const throwUnsupportedError = unsupportedMySQLIsInstalled && !options.ignoreUnsupportedSystemVersion && !options.version

    if (throwUnsupportedError) {
        throw `A version of MySQL is installed on your system that is not supported by this package. If you want to download a MySQL binary instead of getting this error, please set the option "ignoreUnsupportedSystemVersion" to true.`
    }

    logger.log('Version currently installed:', version)
    if (version === null || (options.version && !satisfies(version.version, options.version)) || unsupportedMySQLIsInstalled) {
        if (options.version && lt(coerce(options.version), MIN_SUPPORTED_MYSQL)) {
            //The difference between the throw here and the throw above is this throw is because the selected "version" is not supported.
            //The throw above is because the system-installed MySQL is out of date and "ignoreUnsupportedSystemVersion" is not set to true.
            throw `The selected version of MySQL (${options.version}) is not currently supported by this package. Please choose a different version to use.`
        }

        let binaryInfo: BinaryInfo;
        let binaryFilepath: string;
        binaryInfo = getBinaryURL(options.version, options)
        logger.log('Using MySQL binary version:', binaryInfo.version, 'from URL:', binaryInfo.url)

        try {
            binaryFilepath = await downloadBinary(binaryInfo, options, logger);
        } catch (error) {
            logger.error('Failed to download binary:', error)
            throw `Failed to download binary. The error was: "${error}"`  
        }

        logger.log('Running downloaded binary')
        return await executor.startMySQL(options, {path: binaryFilepath, version: binaryInfo.version, installedOnSystem: false})
    } else {
        logger.log(version)
        return await executor.startMySQL(options, version)
    }
}