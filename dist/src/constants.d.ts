import { InternalServerOptions, OptionTypeChecks } from "../types";
export declare const MIN_SUPPORTED_MYSQL = "8.0.20";
export declare const DEFAULT_OPTIONS_GENERATOR: () => InternalServerOptions;
export declare const DEFAULT_OPTIONS_KEYS: readonly string[];
export declare const LOG_LEVELS: {
    readonly LOG: 0;
    readonly WARN: 1;
    readonly ERROR: 2;
};
export declare const INTERNAL_OPTIONS: readonly ["_DO_NOT_USE_deleteDBAfterStopped", "_DO_NOT_USE_dbPath", "_DO_NOT_USE_binaryDirectoryPath", "_DO_NOT_USE_beforeSignalCleanup", "_DO_NOT_USE_afterSignalCleanup"];
export declare const OPTION_TYPE_CHECKS: OptionTypeChecks;
