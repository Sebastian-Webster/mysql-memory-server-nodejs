import { InternalServerOptions, OptionTypeChecks } from "../types";
import { randomUUID } from "crypto";
import {normalize as normalizePath} from 'path'
import { tmpdir } from "os";
import { valid as validSemver, coerce as coerceSemver } from "semver";

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
    arch: process.arch
});

export const DEFAULT_OPTIONS_KEYS = Object.freeze(Object.keys(DEFAULT_OPTIONS_GENERATOR()))

export const LOG_LEVELS = {
    'LOG': 0,
    'WARN': 1,
    'ERROR': 2
} as const;

const internalOptions = {
    deleteDBAfterStopped: 'true',
    //mysqlmsn = MySQL Memory Server Node.js
    dbPath: normalizePath(`${tmpdir()}/mysqlmsn/dbs/${randomUUID().replace(/-/g, '')}`),
    binaryDirectoryPath: `${tmpdir()}/mysqlmsn/binaries`,
    cli: 'false'
}

export function getInternalEnvVariable(envVar: keyof typeof internalOptions): string {
    return process.env['mysqlmsn_internal_DO_NOT_USE_' + envVar] || internalOptions[envVar]
}

const allowedArches = ['x64', 'arm64']
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
        check: (opt: any) => opt === undefined || allowedArches.includes(opt),
        errorMessage: `Option arch must be either of the following: ${allowedArches.join(', ')}`,
        definedType: 'string'
    }
} as const;

export const MIN_SUPPORTED_MYSQL = '5.7.19';
export const DOWNLOADABLE_MYSQL_VERSIONS = [
    '5.7.19', '5.7.20', '5.7.21', '5.7.22', '5.7.23', '5.7.24', '5.7.25', '5.7.26', '5.7.27', '5.7.28', '5.7.29', '5.7.30', '5.7.31', '5.7.32', '5.7.33', '5.7.34', '5.7.35', '5.7.36', '5.7.37', '5.7.38', '5.7.39', '5.7.40', '5.7.41', '5.7.42', '5.7.43', '5.7.44',

    '8.0.0', '8.0.1', '8.0.2', '8.0.3', '8.0.4',

    '8.0.11', '8.0.12', '8.0.13', '8.0.14', '8.0.15', '8.0.16', '8.0.17', '8.0.18', '8.0.19', '8.0.20', '8.0.21', '8.0.22', '8.0.23', '8.0.24', '8.0.25', '8.0.26', '8.0.27', '8.0.28', '8.0.30', '8.0.31', '8.0.32', '8.0.33', '8.0.34', '8.0.35', '8.0.36', '8.0.37', '8.0.39', '8.0.40', '8.0.41',

    '8.1.0', '8.2.0', '8.3.0',

    '8.4.0', '8.4.1', '8.4.2', '8.4.3', '8.4.4',

    '9.0.0', '9.1.0', '9.2.0'
] as const;
export const MYSQL_ARCH_SUPPORT = {
    darwin: {
        arm64: '8.0.26 - 9.2.0',
        x64: '5.7.19 - 9.2.0'
    },
    linux: {
        arm64: '8.0.31 - 9.2.0',
        x64: '5.7.19 - 9.2.0'
    },
    win32: {
        x64: '5.7.19 - 9.2.0'
    }
} as const;
export const MYSQL_MIN_OS_SUPPORT = {
    win32: {
        x: '0.0.0' // No minimum version is documented as far as I can tell, so allow any minimum version
    },
    linux: {
        x: '0.0.0'// No minimum version is documented as far as I can tell, so allow any minimum version
    },
    darwin: {
        '5.7.19 - 5.7.23 || 8.0.1 - 8.0.3 || 8.0.11 - 8.0.12': '16.0.0',
        '5.7.24 - 5.7.29 || 8.0.4 || 8.0.13 - 8.0.18': '17.0.0',
        '5.7.30 - 5.7.31, 8.0.19 - 8.0.22': '18.0.0',
        //5.7.32 - 5.7.44 is not supported for macOS by MySQL. Those versions are not appearing in this list
        '8.0.0': '13.0.0',
        '8.0.23 - 8.0.27': '19.0.0',
        '8.0.28 - 8.0.31': '20.0.0',
        '8.0.32 - 8.0.34': '21.0.0',
        '8.0.35 - 8.0.39 || 8.1.0 - 8.4.2': '22.0.0',
        '8.0.40 - 8.0.41 || 8.4.3 - 9.2.0': '23.0.0'
    }
}