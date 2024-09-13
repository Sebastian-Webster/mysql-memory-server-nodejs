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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
const crypto_1 = require("crypto");
const path_1 = require("path");
const constants_1 = __importDefault(require("./constants"));
async function createDB(opts) {
    const defaultOptions = {
        dbName: 'dbdata',
        logLevel: 'ERROR',
        portRetries: 10,
        downloadBinaryOnce: true,
        lockRetries: 1000,
        lockRetryWait: 1000,
        username: 'root',
        deleteDBAfterStopped: true,
        //mysqlmsn = MySQL Memory Server Node.js
        dbPath: (0, path_1.normalize)(`${os.tmpdir()}/mysqlmsn/dbs/${(0, crypto_1.randomUUID)().replace(/-/g, '')}`),
        ignoreUnsupportedSystemVersion: false,
        port: 0,
        xPort: 0,
        binaryDirectoryPath: `${os.tmpdir()}/mysqlmsn/binaries`
    };
    const options = { ...defaultOptions, ...opts };
    const logger = new Logger_1.default(options.logLevel);
    const executor = new Executor_1.default(logger);
    const version = await executor.getMySQLVersion(options.version);
    const unsupportedMySQLIsInstalled = version && (0, semver_1.lt)(version.version, constants_1.default.MIN_SUPPORTED_MYSQL);
    const throwUnsupportedError = unsupportedMySQLIsInstalled && !options.ignoreUnsupportedSystemVersion && !options.version;
    if (throwUnsupportedError) {
        throw `A version of MySQL is installed on your system that is not supported by this package. If you want to download a MySQL binary instead of getting this error, please set the option "ignoreUnsupportedSystemVersion" to true.`;
    }
    if (options.version && (0, semver_1.lt)(options.version, constants_1.default.MIN_SUPPORTED_MYSQL)) {
        //The difference between the throw here and the throw above is this throw is because the selected "version" is not supported.
        //The throw above is because the system-installed MySQL is out of date and "ignoreUnsupportedSystemVersion" is not set to true.
        throw `The selected version of MySQL (${options.version}) is not currently supported by this package. Please choose a different version to use.`;
    }
    logger.log('Version currently installed:', version);
    if (version === null || (options.version && !(0, semver_1.satisfies)(version.version, options.version)) || unsupportedMySQLIsInstalled) {
        let binaryInfo;
        let binaryFilepath;
        try {
            binaryInfo = (0, Version_1.default)(versions_json_1.default, options.version);
            logger.log('Using MySQL binary version:', binaryInfo.version, 'from URL:', binaryInfo.url);
        }
        catch (e) {
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
        return await executor.startMySQL(options, binaryFilepath);
    }
    else {
        logger.log(version);
        return await executor.startMySQL(options, version.path);
    }
}
