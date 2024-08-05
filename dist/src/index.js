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
const AbortSignal_1 = __importDefault(require("./libraries/AbortSignal"));
const Version_1 = __importDefault(require("./libraries/Version"));
const versions_json_1 = __importDefault(require("./versions.json"));
const Downloader_1 = require("./libraries/Downloader");
const defaultOptions = {
    dbName: 'dbdata',
    logLevel: 'ERROR',
    portRetries: 10,
    downloadBinaryOnce: true,
    lockRetries: 1000,
    lockRetryWait: 1000
};
process.on('exit', () => {
    AbortSignal_1.default.abort('Process is exiting');
});
async function createDB(opts = defaultOptions) {
    const options = { ...defaultOptions, ...opts };
    const logger = new Logger_1.default(options.logLevel);
    const executor = new Executor_1.default(logger);
    const version = await executor.getMySQLVersion(options.version);
    logger.log('Version currently installed:', version);
    if (version === null || (options.version && !(0, semver_1.satisfies)(version.version, options.version))) {
        let binaryInfo;
        let binaryFilepath;
        try {
            binaryInfo = (0, Version_1.default)(versions_json_1.default, options.version);
            logger.log('Downloading binary:', binaryInfo.version, 'from URL:', binaryInfo.url);
        }
        catch (e) {
            logger.error(e);
            if (options.version) {
                throw `A MySQL version ${options.version} binary could not be found that supports your OS (${os.platform()} | ${os.version()}) and CPU architecture (${os.arch()}). Please check you have the latest version of mysql-memory-server. If the latest version still doesn't support the version you want to use, feel free to make a pull request to add support!`;
            }
            throw `A MySQL binary could not be found that supports your OS (${os.platform()} | ${os.version()}) and CPU architecture (${os.arch()}). Please check you have the latest version of mysql-memory-server. If the latest version still doesn't support your OS and CPU architecture, feel free to make a pull request to add support!`;
        }
        try {
            binaryFilepath = await (0, Downloader_1.downloadBinary)(binaryInfo, options, logger);
        }
        catch (error) {
            logger.error('Failed to download binary');
            throw error;
        }
        logger.log('Running downloaded binary');
        return await executor.startMySQL(options, binaryFilepath);
    }
    else {
        logger.log(version);
        return await executor.startMySQL(options, version.path);
    }
}
