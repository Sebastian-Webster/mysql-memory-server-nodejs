import { InternalServerOptions, OptionTypeChecks } from "../types";
import { randomUUID } from "crypto";
import {normalize as normalizePath} from 'path'
import { tmpdir } from "os";

export const MIN_SUPPORTED_MYSQL = '8.0.20';

export const DEFAULT_OPTIONS: InternalServerOptions = {
    dbName: 'dbdata',
    logLevel: 'ERROR',
    portRetries: 10,
    downloadBinaryOnce: true,
    lockRetries: 1_000,
    lockRetryWait: 1_000,
    username: 'root',
    deleteDBAfterStopped: true,
    //mysqlmsn = MySQL Memory Server Node.js
    dbPath: normalizePath(`${tmpdir()}/mysqlmsn/dbs/${randomUUID().replace(/-/g, '')}`),
    ignoreUnsupportedSystemVersion: false,
    port: 0,
    xPort: 0,
    binaryDirectoryPath: `${tmpdir()}/mysqlmsn/binaries`,
    downloadRetries: 10,
    initSQLString: ''
} as const;

export const LOG_LEVELS = {
    'LOG': 0,
    'WARN': 1,
    'ERROR': 2
} as const;

export const OPTION_TYPE_CHECKS: OptionTypeChecks = {
    dbName: {
        check: (opt: any) => typeof opt === 'string' && opt.length <= 64,
        errorMessage: 'Option dbName must be a string and must not be longer than 64 characters.'
    },
    logLevel: {
        check: (opt: any) => Object.keys(LOG_LEVELS).includes(opt),
        errorMessage: 'Option logLevel must be either "LOG", "WARN", or "ERROR".'
    },
    portRetries: {
        check: (opt: any) => typeof opt === 'number' && opt >= 0,
        errorMessage: 'Option portRetries must be a positive number or 0.'
    },
    downloadBinaryOnce: {
        check: (opt: any) => typeof opt === 'boolean',
        errorMessage: 'Option downloadBinaryOnce must be a boolean.'
    },
    lockRetries: {
        check: (opt: any) => typeof opt === 'number' && opt >= 0,
        errorMessage: 'Option lockRetries must be a positive number or 0.'
    },
    lockRetryWait: {
        check: (opt: any) => typeof opt === 'number' && opt >= 0,
        errorMessage: 'Option lockRetryWait must be a positive number or 0.'
    },
    username: {
        check: (opt: any) => typeof opt === 'string' && opt.length <= 32,
        errorMessage: 'Option username must be a string and must not be longer than 32 characters.'
    },
    _DO_NOT_USE_deleteDBAfterStopped: {
        check: (opt: any) => typeof opt === 'boolean',
        errorMessage: 'Option _DO_NOT_USE_deleteDBAfterStopped must be a boolean.'
    },
    _DO_NOT_USE_dbPath: {
        check: (opt: any) => typeof opt === 'string',
        errorMessage: 'Option _DO_NOT_USE_dbPath must be a string.'
    },
    ignoreUnsupportedSystemVersion: {
        check: (opt: any) => typeof opt === 'boolean',
        errorMessage: 'Option ignoreUnsupportedSystemVersion must be a boolean.'
    },
    port: {
        check: (opt: any) => typeof opt === 'number' && opt >= 0 && opt <= 65535,
        errorMessage: 'Option port must be a number and between 0 and 65535 inclusive.'
    },
    xPort: {
        check: (opt: any) => typeof opt === 'number' && opt >= 0 && opt <= 65535,
        errorMessage: 'Option xPort must be a number and between 0 and 65535 inclusive.'
    },
    _DO_NOT_USE_binaryDirectoryPath: {
        check: (opt: any) => typeof opt === 'string',
        errorMessage: 'Option _DO_NOT_USE_binaryDirectoryPath must be a string.'
    },
    downloadRetries: {
        check: (opt: any) => typeof opt === 'number' && opt >= 0,
        errorMessage: 'Option downloadRetries must be a positive number or 0.'
    },
    initSQLString: {
        check: (opt: any) => typeof opt === 'string',
        errorMessage: 'Option initSQLString must be a string.'
    }
} as const;