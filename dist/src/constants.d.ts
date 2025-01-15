import { InternalServerOptions, OptionTypeChecks } from "../types";
export declare const MIN_SUPPORTED_MYSQL = "8.0.20";
export declare const DEFAULT_OPTIONS_GENERATOR: () => InternalServerOptions;
export declare const DEFAULT_OPTIONS_KEYS: readonly string[];
export declare const LOG_LEVELS: {
    readonly LOG: 0;
    readonly WARN: 1;
    readonly ERROR: 2;
};
declare const internalOptions: {
    deleteDBAfterStopped: string;
    dbPath: string;
    binaryDirectoryPath: string;
    cli: string;
};
export declare function getInternalEnvVariable(envVar: keyof typeof internalOptions): string;
export declare const OPTION_TYPE_CHECKS: OptionTypeChecks;
export {};
