"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const LOG_LEVELS = {
    'LOG': 0,
    'WARN': 1,
    'ERROR': 2
};
class Logger {
    constructor(level) {
        this.LOG_LEVEL = LOG_LEVELS[level];
    }
    log(...args) {
        if (this.LOG_LEVEL === 0) {
            console.log(...args);
        }
    }
    warn(...args) {
        if (this.LOG_LEVEL <= 1) {
            console.warn(...args);
        }
    }
    error(...args) {
        if (this.LOG_LEVEL <= 2) {
            console.error(...args);
        }
    }
}
exports.default = Logger;
