"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDB = createDB;
const Logger_1 = __importDefault(require("./libraries/Logger"));
const Executor_1 = __importDefault(require("./libraries/Executor"));
const semver_1 = require("semver");
const Version_1 = __importDefault(require("./libraries/Version"));
const Downloader_1 = require("./libraries/Downloader");
const constants_1 = require("./constants");
const LinuxOSRelease_1 = __importDefault(require("./libraries/LinuxOSRelease"));
async function createDB(opts) {
    const suppliedOpts = opts || {};
    const suppliedOptsKeys = Object.keys(suppliedOpts);
    const options = { ...constants_1.DEFAULT_OPTIONS };
    for (const opt of suppliedOptsKeys) {
        if (!constants_1.DEFAULT_OPTIONS_KEYS.includes(opt)) {
            throw `Option ${opt} is not a valid option.`;
        }
        if (!constants_1.OPTION_TYPE_CHECKS[opt].check(suppliedOpts[opt])) {
            //Supplied option failed the check
            throw `${constants_1.OPTION_TYPE_CHECKS[opt].errorMessage} | Received value: ${suppliedOpts[opt]} (type: ${typeof suppliedOpts[opt]})`;
        }
        if (suppliedOpts[opt] !== undefined) {
            options[opt] = suppliedOpts[opt];
        }
    }
    const logger = new Logger_1.default(options.logLevel);
    const executor = new Executor_1.default(logger);
    const version = await executor.getMySQLVersion(options.version);
    const unsupportedMySQLIsInstalled = version && (0, semver_1.lt)(version.version, constants_1.MIN_SUPPORTED_MYSQL);
    const throwUnsupportedError = unsupportedMySQLIsInstalled && !options.ignoreUnsupportedSystemVersion && !options.version;
    if (throwUnsupportedError) {
        throw `A version of MySQL is installed on your system that is not supported by this package. If you want to download a MySQL binary instead of getting this error, please set the option "ignoreUnsupportedSystemVersion" to true.`;
    }
    logger.log('Version currently installed:', version, 'Platform:', process.platform, 'etcOSRelease:', LinuxOSRelease_1.default);
    if (version === null || (options.version && !(0, semver_1.satisfies)(version.version, options.version)) || unsupportedMySQLIsInstalled) {
        let binaryInfo;
        let binaryFilepath;
        binaryInfo = (0, Version_1.default)(options.version, options.arch);
        try {
            binaryFilepath = await (0, Downloader_1.downloadBinary)(binaryInfo, options, logger);
        }
        catch (error) {
            logger.error('Failed to download binary:', error);
            throw `Failed to download binary. The error was: "${error}"`;
        }
        logger.log('Running downloaded binary');
        return await executor.startMySQL(options, { path: binaryFilepath, version: binaryInfo.version, installedOnSystem: false, xPluginSupported: binaryInfo.xPluginSupported });
    }
    else {
        logger.log(version);
        return await executor.startMySQL(options, version);
    }
}
