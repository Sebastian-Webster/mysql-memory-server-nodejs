import { InternalServerOptions, OptionTypeChecks } from "../types";
import { randomUUID } from "crypto";
import {normalize as normalizePath} from 'path'
import { tmpdir } from "os";
import { valid as validSemver, coerce as coerceSemver } from "semver";

export const MIN_SUPPORTED_MYSQL = '8.0.20';

export const DEFAULT_OPTIONS_GENERATOR: () => InternalServerOptions = () => ({
    version: undefined,
    dbName: 'dbdata',
    logLevel: 'ERROR',
    portRetries: 10,
    downloadBinaryOnce: true,
    lockRetries: 1_000,
    lockRetryWait: 1_000,
    username: 'root',
    ignoreUnsupportedSystemVersion: false,
    port: 0,
    xPort: 0,
    downloadRetries: 10,
    initSQLString: '',
    arch: process.arch,
    _DO_NOT_USE_deleteDBAfterStopped: true,
    //mysqlmsn = MySQL Memory Server Node.js
    _DO_NOT_USE_dbPath: normalizePath(`${tmpdir()}/mysqlmsn/dbs/${randomUUID().replace(/-/g, '')}`),
    _DO_NOT_USE_binaryDirectoryPath: `${tmpdir()}/mysqlmsn/binaries`,
    _DO_NOT_USE_cli: false
});

export const DEFAULT_OPTIONS_KEYS = Object.freeze(Object.keys(DEFAULT_OPTIONS_GENERATOR()))

export const LOG_LEVELS = {
    'LOG': 0,
    'WARN': 1,
    'ERROR': 2
} as const;

export const INTERNAL_OPTIONS = ['_DO_NOT_USE_deleteDBAfterStopped', '_DO_NOT_USE_dbPath', '_DO_NOT_USE_binaryDirectoryPath', '_DO_NOT_USE_beforeSignalCleanup', '_DO_NOT_USE_afterSignalCleanup'] as const;

const allowedArches = ['x64', 'arm64', undefined]
export const OPTION_TYPE_CHECKS: OptionTypeChecks = {
    version: {
        check: (opt: any) => opt === undefined || typeof opt === 'string' && validSemver(coerceSemver(opt)) !== null,
        errorMessage: 'Option version must be either undefined or a valid semver string.',
        definedType: 'string'
    },
    dbName: {
        check: (opt: any) => opt === undefined || typeof opt === 'string' && opt.length <= 64,
        errorMessage: 'Option dbName must be either undefined or a string that is not longer than 64 characters.',
        definedType: 'string'
    },
    logLevel: {
        check: (opt: any) => opt === undefined || Object.keys(LOG_LEVELS).includes(opt),
        errorMessage: 'Option logLevel must be either undefined or "LOG", "WARN", or "ERROR".',
        definedType: 'string'
    },
    portRetries: {
        check: (opt: any) => opt === undefined || typeof opt === 'number' && opt >= 0,
        errorMessage: 'Option portRetries must be either undefined, a positive number, or 0.',
        definedType: 'number'
    },
    downloadBinaryOnce: {
        check: (opt: any) => opt === undefined || typeof opt === 'boolean',
        errorMessage: 'Option downloadBinaryOnce must be either undefined or a boolean.',
        definedType: 'boolean'
    },
    lockRetries: {
        check: (opt: any) => opt === undefined || typeof opt === 'number' && opt >= 0,
        errorMessage: 'Option lockRetries must be either undefined, a positive number, or 0.',
        definedType: 'number'
    },
    lockRetryWait: {
        check: (opt: any) => opt === undefined || typeof opt === 'number' && opt >= 0,
        errorMessage: 'Option lockRetryWait must be either undefined, a positive number, or 0.',
        definedType: 'number'
    },
    username: {
        check: (opt: any) => opt === undefined || typeof opt === 'string' && opt.length <= 32,
        errorMessage: 'Option username must be either undefined or a string that is not longer than 32 characters.',
        definedType: 'string'
    },
    ignoreUnsupportedSystemVersion: {
        check: (opt: any) => opt === undefined || typeof opt === 'boolean',
        errorMessage: 'Option ignoreUnsupportedSystemVersion must be either undefined or a boolean.',
        definedType: 'boolean'
    },
    port: {
        check: (opt: any) => opt === undefined || typeof opt === 'number' && opt >= 0 && opt <= 65535,
        errorMessage: 'Option port must be either undefined or a number that is between 0 and 65535 inclusive.',
        definedType: 'number'
    },
    xPort: {
        check: (opt: any) => opt === undefined || typeof opt === 'number' && opt >= 0 && opt <= 65535,
        errorMessage: 'Option xPort must be either undefined or a number that is between 0 and 65535 inclusive.',
        definedType: 'number'
    },
    downloadRetries: {
        check: (opt: any) => opt === undefined || typeof opt === 'number' && opt >= 0,
        errorMessage: 'Option downloadRetries must be either undefined, a positive number, or 0.',
        definedType: 'number'
    },
    initSQLString: {
        check: (opt: any) => opt === undefined || typeof opt === 'string',
        errorMessage: 'Option initSQLString must be either undefined or a string.',
        definedType: 'string'
    },
    arch: {
        check: (opt: any) => allowedArches.includes(opt),
        errorMessage: `Option arch must be either of the following: ${allowedArches.join(', ')}`,
        definedType: 'string'
    },
    _DO_NOT_USE_deleteDBAfterStopped: {
        check: (opt: any) => opt === undefined || typeof opt === 'boolean',
        errorMessage: 'Option _DO_NOT_USE_deleteDBAfterStopped must be either undefined or a boolean.',
        definedType: 'boolean'
    },
    _DO_NOT_USE_dbPath: {
        check: (opt: any) => opt === undefined || typeof opt === 'string',
        errorMessage: 'Option _DO_NOT_USE_dbPath must be either undefined or a string.',
        definedType: 'string'
    },
    _DO_NOT_USE_binaryDirectoryPath: {
        check: (opt: any) => opt === undefined || typeof opt === 'string',
        errorMessage: 'Option _DO_NOT_USE_binaryDirectoryPath must be either undefined or a string.',
        definedType: 'string'
    },
    _DO_NOT_USE_cli: {
        check: (opt: any) => opt === undefined || typeof opt === 'boolean',
        errorMessage: 'Option _DO_NOT_USE_cli must be either undefined or a boolean.',
        definedType: 'boolean'
    }
} as const;