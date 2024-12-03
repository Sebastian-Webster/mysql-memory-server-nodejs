import Logger from './libraries/Logger'
import * as os from 'node:os'
import Executor from "./libraries/Executor"
import { satisfies, lt } from "semver"
import { BinaryInfo, InternalServerOptions, ServerOptions } from '../types'
import getBinaryURL from './libraries/Version'
import MySQLVersions from './versions.json'
import { downloadBinary } from './libraries/Downloader'
import { MIN_SUPPORTED_MYSQL, DEFAULT_OPTIONS_KEYS, OPTION_TYPE_CHECKS, INTERNAL_OPTIONS, DEFAULT_OPTIONS_GENERATOR } from './constants'

export async function createDB(opts?: ServerOptions) {
    const suppliedOpts = opts || {};
    const suppliedOptsKeys = Object.keys(suppliedOpts);

    for (const opt of INTERNAL_OPTIONS) {
        if (suppliedOptsKeys.includes(opt)) {
            console.warn(`[ mysql-memory-server - Options WARN ]: Creating MySQL database with option ${opt}. This is considered unstable and should not be used externally. Please consider removing this option.`)
        }
    }

    const options = DEFAULT_OPTIONS_GENERATOR();
    
    for (const opt of suppliedOptsKeys) {
        if (!DEFAULT_OPTIONS_KEYS.includes(opt)) {
            throw `Option ${opt} is not a valid option.`
        }

        if (!OPTION_TYPE_CHECKS[opt].check(suppliedOpts[opt])) {
            //Supplied option failed the check
            throw OPTION_TYPE_CHECKS[opt].errorMessage
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

    if (options.version && lt(options.version, MIN_SUPPORTED_MYSQL)) {
        //The difference between the throw here and the throw above is this throw is because the selected "version" is not supported.
        //The throw above is because the system-installed MySQL is out of date and "ignoreUnsupportedSystemVersion" is not set to true.
        throw `The selected version of MySQL (${options.version}) is not currently supported by this package. Please choose a different version to use.`
    }

    logger.log('Version currently installed:', version)
    if (version === null || (options.version && !satisfies(version.version, options.version)) || unsupportedMySQLIsInstalled) {
        let binaryInfo: BinaryInfo;
        let binaryFilepath: string;
        try {
            binaryInfo = getBinaryURL(MySQLVersions, options.version, options)
            logger.log('Using MySQL binary version:', binaryInfo.version, 'from URL:', binaryInfo.url)
        } catch (e) {
            logger.error(e)
            if (options.version) {
                throw `A MySQL version ${options.version} binary could not be found that supports your OS (${os.platform()} | ${os.version()} | ${os.release()}) and CPU architecture (${os.arch()}). Please check you have the latest version of mysql-memory-server. If the latest version still doesn't support the version you want to use, feel free to make a pull request to add support!`
            }
            throw `A MySQL binary could not be found that supports your OS (${os.platform()} | ${os.version()} | ${os.release()}) and CPU architecture (${os.arch()}). Please check you have the latest version of mysql-memory-server. If the latest version still doesn't support your OS and CPU architecture, feel free to make a pull request to add support!`
        }

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