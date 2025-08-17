"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MYSQL_LINUX_MINIMAL_REBUILD_VERSIONS = exports.MYSQL_LINUX_FILE_EXTENSIONS = exports.MYSQL_LINUX_MINIMAL_INSTALL_AVAILABLE_ARM64 = exports.MYSQL_LINUX_MINIMAL_INSTALL_AVAILABLE = exports.MYSQL_LINUX_GLIBC_VERSIONS = exports.MYSQL_MACOS_VERSIONS_IN_FILENAME = exports.RC_MYSQL_VERSIONS = exports.DMR_MYSQL_VERSIONS = exports.MYSQL_MIN_OS_SUPPORT = exports.MYSQL_ARCH_SUPPORT = exports.DOWNLOADABLE_MYSQL_VERSIONS = exports.MySQLCDNArchivesBaseURL = exports.MySQLCDNDownloadsBaseURL = exports.MIN_SUPPORTED_MYSQL = exports.OPTION_TYPE_CHECKS = exports.LOG_LEVELS = exports.DEFAULT_OPTIONS_KEYS = exports.DEFAULT_OPTIONS = void 0;
exports.getInternalEnvVariable = getInternalEnvVariable;
const path_1 = require("path");
const os_1 = require("os");
const semver_1 = require("semver");
exports.DEFAULT_OPTIONS = {
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
    xEnabled: 'FORCE'
};
exports.DEFAULT_OPTIONS_KEYS = Object.freeze(Object.keys(exports.DEFAULT_OPTIONS));
exports.LOG_LEVELS = {
    'LOG': 0,
    'WARN': 1,
    'ERROR': 2
};
const internalOptions = {
    deleteDBAfterStopped: 'true',
    //mysqlmsn = MySQL Memory Server Node.js
    databaseDirectoryPath: (0, path_1.normalize)(`${(0, os_1.tmpdir)()}/mysqlmsn/dbs`),
    binaryDirectoryPath: `${(0, os_1.tmpdir)()}/mysqlmsn/binaries`,
    cli: 'false'
};
function getInternalEnvVariable(envVar) {
    return process.env['mysqlmsn_internal_DO_NOT_USE_' + envVar] || internalOptions[envVar];
}
const allowedArches = ['x64', 'arm64'];
const pluginActivationStates = ['OFF', 'FORCE'];
exports.OPTION_TYPE_CHECKS = {
    version: {
        check: (opt) => opt === undefined || typeof opt === 'string' && (0, semver_1.valid)((0, semver_1.coerce)(opt)) !== null,
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
    arch: {
        check: (opt) => opt === undefined || allowedArches.includes(opt),
        errorMessage: `Option arch must be either of the following: ${allowedArches.join(', ')}`,
        definedType: 'string'
    },
    xEnabled: {
        check: (opt) => opt === undefined || pluginActivationStates.includes(opt),
        errorMessage: `xEnabled must be either undefined or one of the following: ${pluginActivationStates.join(', ')}`,
        definedType: 'boolean'
    }
};
exports.MIN_SUPPORTED_MYSQL = '5.7.19';
exports.MySQLCDNDownloadsBaseURL = 'https://cdn.mysql.com//Downloads/MySQL-';
exports.MySQLCDNArchivesBaseURL = 'https://cdn.mysql.com/archives/mysql-';
// Versions 8.0.29, 8.0.38, 8.4.1, and 9.0.0 have been purposefully left out of this list as MySQL has removed them from the CDN due to critical issues.
exports.DOWNLOADABLE_MYSQL_VERSIONS = [
    '5.7.19', '5.7.20', '5.7.21', '5.7.22', '5.7.23', '5.7.24', '5.7.25', '5.7.26', '5.7.27', '5.7.28', '5.7.29', '5.7.30', '5.7.31', '5.7.32', '5.7.33', '5.7.34', '5.7.35', '5.7.36', '5.7.37', '5.7.38', '5.7.39', '5.7.40', '5.7.41', '5.7.42', '5.7.43', '5.7.44',
    '8.0.0', '8.0.1', '8.0.2', '8.0.3', '8.0.4',
    '8.0.11', '8.0.12', '8.0.13', '8.0.14', '8.0.15', '8.0.16', '8.0.17', '8.0.18', '8.0.19', '8.0.20', '8.0.21', '8.0.22', '8.0.23', '8.0.24', '8.0.25', '8.0.26', '8.0.27', '8.0.28', '8.0.30', '8.0.31', '8.0.32', '8.0.33', '8.0.34', '8.0.35', '8.0.36', '8.0.37', '8.0.39', '8.0.40', '8.0.41', '8.0.42', '8.0.43',
    '8.1.0', '8.2.0', '8.3.0',
    '8.4.0', '8.4.2', '8.4.3', '8.4.4', '8.4.5', '8.4.6',
    '9.0.1', '9.1.0', '9.2.0', '9.3.0', '9.4.0'
];
exports.MYSQL_ARCH_SUPPORT = {
    darwin: {
        arm64: '8.0.26 - 9.4.0',
        x64: '5.7.19 - 9.4.0'
    },
    linux: {
        arm64: '8.0.31 - 9.4.0',
        x64: '5.7.19 - 9.4.0'
    },
    win32: {
        x64: '5.7.19 - 9.4.0'
    }
};
exports.MYSQL_MIN_OS_SUPPORT = {
    win32: {
        x: '0.0.0' // No minimum version is documented as far as I can tell, so allow any minimum version
    },
    linux: {
        x: '0.0.0' // No minimum version is documented as far as I can tell, so allow any minimum version
    },
    darwin: {
        '5.7.19 - 5.7.23 || 8.0.1 - 8.0.3 || 8.0.11 - 8.0.12': '16.0.0',
        '5.7.24 - 5.7.29 || 8.0.4 || 8.0.13 - 8.0.18': '17.0.0',
        '5.7.30 - 5.7.31 || 8.0.19 - 8.0.22': '18.0.0',
        //5.7.32 - 5.7.44 is not supported for macOS by MySQL. Those versions are not appearing in this list
        '8.0.0': '13.0.0',
        '8.0.23 - 8.0.27': '19.0.0',
        '8.0.28 - 8.0.31': '20.0.0',
        '8.0.32 - 8.0.34': '21.0.0',
        '8.0.35 - 8.0.39 || 8.1.0 - 8.4.2 || 9.0.1': '22.0.0',
        '8.0.40 - 8.0.43 || 8.4.3 - 8.4.6 || 9.1.0 - 9.4.0': '23.0.0'
    }
};
exports.DMR_MYSQL_VERSIONS = '8.0.0 - 8.0.2';
exports.RC_MYSQL_VERSIONS = '8.0.3 - 8.0.4';
exports.MYSQL_MACOS_VERSIONS_IN_FILENAME = {
    '5.7.19 - 5.7.20 || 8.0.1 - 8.0.3': 'macos10.12',
    '5.7.21 - 5.7.23 || 8.0.4 - 8.0.12': 'macos10.13',
    '5.7.24 - 5.7.31 || 8.0.13 - 8.0.18': 'macos10.14',
    '8.0.0': 'osx10.11',
    '8.0.19 - 8.0.23': 'macos10.15',
    '8.0.24 - 8.0.28': 'macos11',
    '8.0.30 - 8.0.31': 'macos12',
    '8.0.32 - 8.0.35 || 8.1.0 - 8.2.0': 'macos13',
    '8.0.36 - 8.0.40 || 8.3.0 - 8.4.3 || 9.0.1 - 9.1.0': 'macos14',
    '8.0.41 - 8.0.43 || 8.4.4 - 8.4.6 || 9.2.0 - 9.4.0': 'macos15'
};
exports.MYSQL_LINUX_GLIBC_VERSIONS = {
    //8.0.42 - 8.0.43, 8.4.5 - 8.4.6, and 9.3.0 - 9.4.0 with glibc 2.28 does NOT have a minimal install version for x64 but it DOES have arm64 support.
    //8.0.42 - 8.0.43, 8.4.5 - 8.4.6, and 9.3.0 - 9.4.0 with glibc 2.17 DOES have a minimal install version for x64 but does NOT have arm64 support.
    //The new versions having these differences between the glibc versions has led to the glibc versions being different depending on CPU architecture for this package.
    //Neither glibc versions for the above MySQL versions have an arm64 minimal install.
    x64: {
        '5.7.19 - 8.0.20': '2.12',
        '8.0.21 - 9.4.0': '2.17'
    },
    arm64: {
        '5.7.19 - 8.0.20': '2.12',
        '8.0.21 - 8.0.41 || 8.1.0 - 8.4.4 || 9.0.1 - 9.2.0': '2.17',
        '8.0.42 - 8.0.43 || 8.4.5 - 8.4.6 || 9.3.0 - 9.4.0': '2.28'
    }
};
exports.MYSQL_LINUX_MINIMAL_INSTALL_AVAILABLE = {
    '5.7.19 - 8.0.15': 'no',
    '8.0.16 - 8.0.20': 'no-glibc-tag',
    '8.0.21 - 9.4.0': 'glibc-tag'
};
exports.MYSQL_LINUX_MINIMAL_INSTALL_AVAILABLE_ARM64 = '8.0.33 - 8.0.41 || 8.1.0 - 8.4.4 || 9.0.1 - 9.2.0'; //Not available for < 8.0.33 and 8.0.42 - 8.0.43, 8.4.5 - 8.4.6, and 9.3.0 - 9.4.0
exports.MYSQL_LINUX_FILE_EXTENSIONS = {
    x64: {
        '5.7.19 - 8.0.11': 'gz',
        '8.0.12 - 9.4.0': 'xz'
    },
    arm64: {
        '8.0.31 - 8.0.32': 'gz',
        '8.0.33 - 9.4.0': 'xz'
    }
};
exports.MYSQL_LINUX_MINIMAL_REBUILD_VERSIONS = '8.0.26';
