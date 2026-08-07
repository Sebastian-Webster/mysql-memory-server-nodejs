import Logger from './libraries/Logger'
import Executor from "./libraries/Executor"
import { satisfies, lt } from "semver"
import { BinaryInfo, InternalServerOptions, ServerOptions } from '../types'
import getBinaryURL from './libraries/Version'
import { downloadBinary } from './libraries/Downloader'
import { MIN_SUPPORTED_MYSQL, DEFAULT_OPTIONS_KEYS, OPTION_TYPE_CHECKS, DEFAULT_OPTIONS } from './constants'
import etcOSRelease from './libraries/LinuxOSRelease'

export async function createDB(opts?: ServerOptions) {
    const suppliedOpts: ServerOptions = opts || {};

    const options: InternalServerOptions = {...DEFAULT_OPTIONS}
    
    for (const opt in suppliedOpts) {
        const optKey = opt as keyof typeof suppliedOpts
        const optValue = suppliedOpts[optKey]

        if (!DEFAULT_OPTIONS_KEYS.includes(optKey)) {
            throw `Option ${optKey} is not a valid option.`
        }

        if (!OPTION_TYPE_CHECKS[optKey].check(suppliedOpts[optKey])) {
            //Supplied option failed the check
            throw `${OPTION_TYPE_CHECKS[optKey].errorMessage} | Received value: ${optValue} (type: ${typeof optValue})`
        }

        if (optValue !== undefined) {
            (options as Record<string, unknown>)[optKey] = optValue
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

    logger.log('Version currently installed:', version, 'Platform:', process.platform, 'etcOSRelease:', etcOSRelease)
    if (version === null || (options.version && !satisfies(version.version, options.version)) || unsupportedMySQLIsInstalled) {
        let binaryInfo: BinaryInfo;
        let binaryFilepath: string;
        binaryInfo = getBinaryURL(options.version, options.arch)

        try {
            binaryFilepath = await downloadBinary(binaryInfo, options, logger);
        } catch (error) {
            logger.error('Failed to download binary:', error)
            throw `Failed to download binary. The error was: "${error}"`
        }

        logger.log('Running downloaded binary')
        return await executor.startMySQL(options, {path: binaryFilepath, version: binaryInfo.version, installedOnSystem: false, xPluginSupported: binaryInfo.xPluginSupported})
    } else {
        logger.log(version)
        return await executor.startMySQL(options, version)
    }
}