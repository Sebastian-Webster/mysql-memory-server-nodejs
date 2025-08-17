import { InternalServerOptions, OptionTypeChecks } from "../types";
export declare const DEFAULT_OPTIONS: InternalServerOptions;
export declare const DEFAULT_OPTIONS_KEYS: readonly string[];
export declare const LOG_LEVELS: {
    readonly LOG: 0;
    readonly WARN: 1;
    readonly ERROR: 2;
};
declare const internalOptions: {
    deleteDBAfterStopped: string;
    databaseDirectoryPath: string;
    binaryDirectoryPath: string;
    cli: string;
};
export declare function getInternalEnvVariable(envVar: keyof typeof internalOptions): string;
export declare const OPTION_TYPE_CHECKS: OptionTypeChecks;
export declare const MIN_SUPPORTED_MYSQL = "5.7.19";
export declare const MySQLCDNDownloadsBaseURL = "https://cdn.mysql.com//Downloads/MySQL-";
export declare const MySQLCDNArchivesBaseURL = "https://cdn.mysql.com/archives/mysql-";
export declare const DOWNLOADABLE_MYSQL_VERSIONS: readonly ["5.7.19", "5.7.20", "5.7.21", "5.7.22", "5.7.23", "5.7.24", "5.7.25", "5.7.26", "5.7.27", "5.7.28", "5.7.29", "5.7.30", "5.7.31", "5.7.32", "5.7.33", "5.7.34", "5.7.35", "5.7.36", "5.7.37", "5.7.38", "5.7.39", "5.7.40", "5.7.41", "5.7.42", "5.7.43", "5.7.44", "8.0.0", "8.0.1", "8.0.2", "8.0.3", "8.0.4", "8.0.11", "8.0.12", "8.0.13", "8.0.14", "8.0.15", "8.0.16", "8.0.17", "8.0.18", "8.0.19", "8.0.20", "8.0.21", "8.0.22", "8.0.23", "8.0.24", "8.0.25", "8.0.26", "8.0.27", "8.0.28", "8.0.30", "8.0.31", "8.0.32", "8.0.33", "8.0.34", "8.0.35", "8.0.36", "8.0.37", "8.0.39", "8.0.40", "8.0.41", "8.0.42", "8.0.43", "8.1.0", "8.2.0", "8.3.0", "8.4.0", "8.4.2", "8.4.3", "8.4.4", "8.4.5", "8.4.6", "9.0.1", "9.1.0", "9.2.0", "9.3.0", "9.4.0"];
export declare const MYSQL_ARCH_SUPPORT: {
    readonly darwin: {
        readonly arm64: "8.0.26 - 9.4.0";
        readonly x64: "5.7.19 - 9.4.0";
    };
    readonly linux: {
        readonly arm64: "8.0.31 - 9.4.0";
        readonly x64: "5.7.19 - 9.4.0";
    };
    readonly win32: {
        readonly x64: "5.7.19 - 9.4.0";
    };
};
export declare const MYSQL_MIN_OS_SUPPORT: {
    readonly win32: {
        readonly x: "0.0.0";
    };
    readonly linux: {
        readonly x: "0.0.0";
    };
    readonly darwin: {
        readonly '5.7.19 - 5.7.23 || 8.0.1 - 8.0.3 || 8.0.11 - 8.0.12': "16.0.0";
        readonly '5.7.24 - 5.7.29 || 8.0.4 || 8.0.13 - 8.0.18': "17.0.0";
        readonly '5.7.30 - 5.7.31 || 8.0.19 - 8.0.22': "18.0.0";
        readonly '8.0.0': "13.0.0";
        readonly '8.0.23 - 8.0.27': "19.0.0";
        readonly '8.0.28 - 8.0.31': "20.0.0";
        readonly '8.0.32 - 8.0.34': "21.0.0";
        readonly '8.0.35 - 8.0.39 || 8.1.0 - 8.4.2 || 9.0.1': "22.0.0";
        readonly '8.0.40 - 8.0.43 || 8.4.3 - 8.4.6 || 9.1.0 - 9.4.0': "23.0.0";
    };
};
export declare const DMR_MYSQL_VERSIONS = "8.0.0 - 8.0.2";
export declare const RC_MYSQL_VERSIONS = "8.0.3 - 8.0.4";
export declare const MYSQL_MACOS_VERSIONS_IN_FILENAME: {
    readonly '5.7.19 - 5.7.20 || 8.0.1 - 8.0.3': "macos10.12";
    readonly '5.7.21 - 5.7.23 || 8.0.4 - 8.0.12': "macos10.13";
    readonly '5.7.24 - 5.7.31 || 8.0.13 - 8.0.18': "macos10.14";
    readonly '8.0.0': "osx10.11";
    readonly '8.0.19 - 8.0.23': "macos10.15";
    readonly '8.0.24 - 8.0.28': "macos11";
    readonly '8.0.30 - 8.0.31': "macos12";
    readonly '8.0.32 - 8.0.35 || 8.1.0 - 8.2.0': "macos13";
    readonly '8.0.36 - 8.0.40 || 8.3.0 - 8.4.3 || 9.0.1 - 9.1.0': "macos14";
    readonly '8.0.41 - 8.0.43 || 8.4.4 - 8.4.6 || 9.2.0 - 9.4.0': "macos15";
};
export declare const MYSQL_LINUX_GLIBC_VERSIONS: {
    readonly x64: {
        readonly '5.7.19 - 8.0.20': "2.12";
        readonly '8.0.21 - 9.4.0': "2.17";
    };
    readonly arm64: {
        readonly '5.7.19 - 8.0.20': "2.12";
        readonly '8.0.21 - 8.0.41 || 8.1.0 - 8.4.4 || 9.0.1 - 9.2.0': "2.17";
        readonly '8.0.42 - 8.0.43 || 8.4.5 - 8.4.6 || 9.3.0 - 9.4.0': "2.28";
    };
};
export declare const MYSQL_LINUX_MINIMAL_INSTALL_AVAILABLE: {
    readonly '5.7.19 - 8.0.15': "no";
    readonly '8.0.16 - 8.0.20': "no-glibc-tag";
    readonly '8.0.21 - 9.4.0': "glibc-tag";
};
export declare const MYSQL_LINUX_MINIMAL_INSTALL_AVAILABLE_ARM64 = "8.0.33 - 8.0.41 || 8.1.0 - 8.4.4 || 9.0.1 - 9.2.0";
export declare const MYSQL_LINUX_FILE_EXTENSIONS: {
    readonly x64: {
        readonly '5.7.19 - 8.0.11': "gz";
        readonly '8.0.12 - 9.4.0': "xz";
    };
    readonly arm64: {
        readonly '8.0.31 - 8.0.32': "gz";
        readonly '8.0.33 - 9.4.0': "xz";
    };
};
export declare const MYSQL_LINUX_MINIMAL_REBUILD_VERSIONS = "8.0.26";
export {};
