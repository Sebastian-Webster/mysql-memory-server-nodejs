import { MYSQL_MIN_OS_SUPPORT, OPTION_TYPE_CHECKS } from "./constants";

export function isNodeError(error: unknown): error is NodeJS.ErrnoException {
    return error instanceof Error && (
        'errno' in error ||
        'code' in error ||
        'path' in error ||
        'syscall' in error
    )
}

export function isSupportedOS(os: NodeJS.Platform): os is keyof typeof MYSQL_MIN_OS_SUPPORT {
    return os in MYSQL_MIN_OS_SUPPORT
}

export function isValidOption(name: string): name is keyof typeof OPTION_TYPE_CHECKS {
    return name in OPTION_TYPE_CHECKS
}