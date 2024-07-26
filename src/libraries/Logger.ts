const LOG_LEVELS = {
    'LOG': 0,
    'WARN': 1,
    'ERROR': 2
}

class Logger {
    LOG_LEVEL: number;

    constructor(level: LOG_LEVEL) {
        this.LOG_LEVEL = LOG_LEVELS[level];
    }

    log(...args: any) {
        if (this.LOG_LEVEL === 0) {
            console.log.apply(null, args)
        }
    }

    warn(...args: any) {
        if (this.LOG_LEVEL <= 1) {
            console.warn.apply(null, args)
        }
    }

    error(...args: any) {
        if (this.LOG_LEVEL <= 2) {
            console.error.apply(null, args)
        }
    }
}

export default Logger;