import { MYSQL_MIN_OS_SUPPORT, OPTION_TYPE_CHECKS } from "./constants";
export declare function isSupportedOS(os: NodeJS.Platform): os is keyof typeof MYSQL_MIN_OS_SUPPORT;
export declare function isValidOption(name: string): name is keyof typeof OPTION_TYPE_CHECKS;
