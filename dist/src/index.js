"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDB = createDB;
const Logger_1 = __importDefault(require("./libraries/Logger"));
const os = __importStar(require("node:os"));
const Executor_1 = __importDefault(require("./libraries/Executor"));
const semver_1 = require("semver");
const Version_1 = __importDefault(require("./libraries/Version"));
const versions_json_1 = __importDefault(require("./versions.json"));
const Downloader_1 = require("./libraries/Downloader");
const constants_1 = require("./constants");
async function createDB(opts) {
    const suppliedOpts = opts || {};
    const suppliedOptsKeys = Object.keys(suppliedOpts);
    const options = (0, constants_1.DEFAULT_OPTIONS_GENERATOR)();
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
    logger.log('Version currently installed:', version);
    if (version === null || (options.version && !(0, semver_1.satisfies)(version.version, options.version)) || unsupportedMySQLIsInstalled) {
        let binaryInfo;
        let binaryFilepath;
        try {
            binaryInfo = (0, Version_1.default)(versions_json_1.default, options.version, options);
            logger.log('Using MySQL binary version:', binaryInfo.version, 'from URL:', binaryInfo.url);
        }
        catch (e) {
            if (options.version && (0, semver_1.lt)((0, semver_1.coerce)(options.version), constants_1.MIN_SUPPORTED_MYSQL)) {
                //The difference between the throw here and the throw above is this throw is because the selected "version" is not supported.
                //The throw above is because the system-installed MySQL is out of date and "ignoreUnsupportedSystemVersion" is not set to true.
                throw `The selected version of MySQL (${options.version}) is not currently supported by this package. Please choose a different version to use.`;
            }
            logger.error(e);
            if (options.version) {
                throw `A MySQL version ${options.version} binary could not be found that supports your OS (${os.platform()} | ${os.version()} | ${os.release()}) and CPU architecture (${os.arch()}). Please check you have the latest version of mysql-memory-server. If the latest version still doesn't support the version you want to use, feel free to make a pull request to add support!`;
            }
            throw `A MySQL binary could not be found that supports your OS (${os.platform()} | ${os.version()} | ${os.release()}) and CPU architecture (${os.arch()}). Please check you have the latest version of mysql-memory-server. If the latest version still doesn't support your OS and CPU architecture, feel free to make a pull request to add support!`;
        }
        try {
            binaryFilepath = await (0, Downloader_1.downloadBinary)(binaryInfo, options, logger);
        }
        catch (error) {
            logger.error('Failed to download binary:', error);
            throw `Failed to download binary. The error was: "${error}"`;
        }
        logger.log('Running downloaded binary');
        return await executor.startMySQL(options, { path: binaryFilepath, version: binaryInfo.version, installedOnSystem: false });
    }
    else {
        logger.log(version);
        return await executor.startMySQL(options, version);
    }
}
