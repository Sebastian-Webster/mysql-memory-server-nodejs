import { LOG_LEVEL } from "../../types";
import { LOG_LEVELS } from "../constants";

class Logger {
    LOG_LEVEL: number;

    constructor(level: LOG_LEVEL) {
        this.LOG_LEVEL = LOG_LEVELS[level];
    }

    log(...args: any) {
        if (this.LOG_LEVEL === 0) {
            console.log('[mysql-memory-server - LOG]:', ...args)
        }
    }

    warn(...args: any) {
        if (this.LOG_LEVEL <= 1) {
            console.warn('[mysql-memory-server - WARN]:', ...args)
        }
    }

    error(...args: any) {
        if (this.LOG_LEVEL <= 2) {
            console.error('[mysql-memory-server - ERROR]:', ...args)
        }
    }
}

export default Logger;