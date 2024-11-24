"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OPTION_TYPE_CHECKS = exports.INTERNAL_OPTIONS = exports.LOG_LEVELS = exports.DEFAULT_OPTIONS_KEYS = exports.DEFAULT_OPTIONS_GENERATOR = exports.MIN_SUPPORTED_MYSQL = void 0;
const crypto_1 = require("crypto");
const path_1 = require("path");
const os_1 = require("os");
const semver_1 = require("semver");
exports.MIN_SUPPORTED_MYSQL = '8.0.20';
const DEFAULT_OPTIONS_GENERATOR = () => ({
    version: undefined,
    dbName: 'dbdata',
    logLevel: 'ERROR',
    portRetries: 10,
    downloadBinaryOnce: true,
    lockRetries: 1000,
    lockRetryWait: 1000,
    username: 'root',
    ignoreUnsupportedSystemVersion: false,
    port: 0,
    xPort: 0,
    downloadRetries: 10,
    initSQLString: '',
    _DO_NOT_USE_deleteDBAfterStopped: true,
    //mysqlmsn = MySQL Memory Server Node.js
    _DO_NOT_USE_dbPath: (0, path_1.normalize)(`${(0, os_1.tmpdir)()}/mysqlmsn/dbs/${(0, crypto_1.randomUUID)().replace(/-/g, '')}`),
    _DO_NOT_USE_binaryDirectoryPath: `${(0, os_1.tmpdir)()}/mysqlmsn/binaries`,
    _DO_NOT_USE_beforeSignalCleanupMessage: '',
    _DO_NOT_USE_afterSignalCleanupMessage: ''
});
exports.DEFAULT_OPTIONS_GENERATOR = DEFAULT_OPTIONS_GENERATOR;
exports.DEFAULT_OPTIONS_KEYS = Object.freeze(Object.keys((0, exports.DEFAULT_OPTIONS_GENERATOR)()));
exports.LOG_LEVELS = {
    'LOG': 0,
    'WARN': 1,
    'ERROR': 2
};
exports.INTERNAL_OPTIONS = ['_DO_NOT_USE_deleteDBAfterStopped', '_DO_NOT_USE_dbPath', '_DO_NOT_USE_binaryDirectoryPath', '_DO_NOT_USE_beforeSignalCleanup', '_DO_NOT_USE_afterSignalCleanup'];
exports.OPTION_TYPE_CHECKS = {
    version: {
        check: (opt) => opt === undefined || typeof opt === 'string' && (0, semver_1.valid)(opt) !== null,
        errorMessage: 'Option version must be either undefined or a valid semver string.',
        definedType: 'string'
    },
    dbName: {
        check: (opt) => opt === undefined || typeof opt === 'string' && opt.length <= 64,
        errorMessage: 'Option dbName must be either undefined or a string that is not longer than 64 characters.',
        definedType: 'string'
    },
    logLevel: {
        check: (opt) => opt === undefined || Object.keys(exports.LOG_LEVELS).includes(opt),
        errorMessage: 'Option logLevel must be either undefined or "LOG", "WARN", or "ERROR".',
        definedType: 'string'
    },
    portRetries: {
        check: (opt) => opt === undefined || typeof opt === 'number' && opt >= 0,
        errorMessage: 'Option portRetries must be either undefined, a positive number, or 0.',
        definedType: 'number'
    },
    downloadBinaryOnce: {
        check: (opt) => opt === undefined || typeof opt === 'boolean',
        errorMessage: 'Option downloadBinaryOnce must be either undefined or a boolean.',
        definedType: 'boolean'
    },
    lockRetries: {
        check: (opt) => opt === undefined || typeof opt === 'number' && opt >= 0,
        errorMessage: 'Option lockRetries must be either undefined, a positive number, or 0.',
        definedType: 'number'
    },
    lockRetryWait: {
        check: (opt) => opt === undefined || typeof opt === 'number' && opt >= 0,
        errorMessage: 'Option lockRetryWait must be either undefined, a positive number, or 0.',
        definedType: 'number'
    },
    username: {
        check: (opt) => opt === undefined || typeof opt === 'string' && opt.length <= 32,
        errorMessage: 'Option username must be either undefined or a string that is not longer than 32 characters.',
        definedType: 'string'
    },
    ignoreUnsupportedSystemVersion: {
        check: (opt) => opt === undefined || typeof opt === 'boolean',
        errorMessage: 'Option ignoreUnsupportedSystemVersion must be either undefined or a boolean.',
        definedType: 'boolean'
    },
    port: {
        check: (opt) => opt === undefined || typeof opt === 'number' && opt >= 0 && opt <= 65535,
        errorMessage: 'Option port must be either undefined or a number that is between 0 and 65535 inclusive.',
        definedType: 'number'
    },
    xPort: {
        check: (opt) => opt === undefined || typeof opt === 'number' && opt >= 0 && opt <= 65535,
        errorMessage: 'Option xPort must be either undefined or a number that is between 0 and 65535 inclusive.',
        definedType: 'number'
    },
    downloadRetries: {
        check: (opt) => opt === undefined || typeof opt === 'number' && opt >= 0,
        errorMessage: 'Option downloadRetries must be either undefined, a positive number, or 0.',
        definedType: 'number'
    },
    initSQLString: {
        check: (opt) => opt === undefined || typeof opt === 'string',
        errorMessage: 'Option initSQLString must be either undefined or a string.',
        definedType: 'string'
    },
    _DO_NOT_USE_deleteDBAfterStopped: {
        check: (opt) => opt === undefined || typeof opt === 'boolean',
        errorMessage: 'Option _DO_NOT_USE_deleteDBAfterStopped must be either undefined or a boolean.',
        definedType: 'boolean'
    },
    _DO_NOT_USE_dbPath: {
        check: (opt) => opt === undefined || typeof opt === 'string',
        errorMessage: 'Option _DO_NOT_USE_dbPath must be either undefined or a string.',
        definedType: 'string'
    },
    _DO_NOT_USE_binaryDirectoryPath: {
        check: (opt) => opt === undefined || typeof opt === 'string',
        errorMessage: 'Option _DO_NOT_USE_binaryDirectoryPath must be either undefined or a string.',
        definedType: 'string'
    },
    _DO_NOT_USE_beforeSignalCleanupMessage: {
        check: (opt) => opt === undefined || typeof opt === 'string',
        errorMessage: 'Option _DO_NOT_USE_beforeSignalCleanup must be either undefined or a string.',
        definedType: 'string'
    },
    _DO_NOT_USE_afterSignalCleanupMessage: {
        check: (opt) => opt === undefined || typeof opt === 'string',
        errorMessage: 'Option _DO_NOT_USE_afterSignalCleanup must be either undefined or a string.',
        definedType: 'string'
    }
};
