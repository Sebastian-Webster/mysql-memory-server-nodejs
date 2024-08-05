import { LOG_LEVEL } from "../../types";
declare class Logger {
    LOG_LEVEL: number;
    constructor(level: LOG_LEVEL);
    log(...args: any): void;
    warn(...args: any): void;
    error(...args: any): void;
}
export default Logger;
