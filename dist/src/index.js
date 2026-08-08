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
    const options = { ...constants_1.DEFAULT_OPTIONS };
    for (const opt in suppliedOpts) {
        const optKey = opt;
        const optValue = suppliedOpts[optKey];
        if (!constants_1.DEFAULT_OPTIONS_KEYS.includes(optKey)) {
            throw `Option ${optKey} is not a valid option.`;
        }
        if (!constants_1.OPTION_TYPE_CHECKS[optKey].check(suppliedOpts[optKey])) {
            //Supplied option failed the check
            throw `${constants_1.OPTION_TYPE_CHECKS[optKey].errorMessage} | Received value: ${optValue} (type: ${typeof optValue})`;
        }
        if (optValue !== undefined) {
            options[optKey] = optValue;
        }
    }
    if (options.arch === 'unsupported') {
        throw "mysql-memory-server can only execute arm64 and x64 versions of MySQL. Your CPU architecture has been detected as one that isn't either one of those. If that is wrong, please report a bug on GitHub. If you would like to forcefully execute an arm64 or x64 MySQL binary on this system even when your CPU architecture isn't one of those, please refer to the documentation for the 'options.arch' option to set the binary architecture to execute.";
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
