"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.waitForLock = waitForLock;
exports.lockFile = lockFile;
const promises_1 = __importDefault(require("fs/promises"));
const mtimeUpdateIntervalTime = 2_000;
const mtimeLimit = 10_000;
async function waitForLock(path, options) {
    const lockPath = `${path}.lock`;
    let retries = 0;
    do {
        retries++;
        try {
            const stat = await promises_1.default.stat(lockPath);
            if (Date.now() - stat.mtime.getTime() > mtimeLimit) {
                return;
            }
            else {
                await new Promise(resolve => setTimeout(resolve, options.lockRetryWait));
            }
        }
        catch (e) {
            if (e.code === 'ENOENT') {
                return;
            }
            else {
                throw e;
            }
        }
    } while (retries <= options.lockRetries);
    throw `lockRetries has been exceeded. Lock had not been released after ${options.lockRetryWait} * ${options.lockRetries} (${options.lockRetryWait * options.lockRetries}) milliseconds.`;
}
function setupMTimeEditor(lockPath) {
    const interval = setInterval(async () => {
        try {
            const time = new Date();
            await promises_1.default.utimes(lockPath, time, time);
        }
        catch { }
    }, mtimeUpdateIntervalTime);
    return async () => {
        clearInterval(interval);
        await promises_1.default.rmdir(lockPath);
    };
}
async function lockFile(path) {
    const lockPath = `${path}.lock`;
    try {
        await promises_1.default.mkdir(lockPath);
        return setupMTimeEditor(lockPath);
    }
    catch (e) {
        if (e.code === 'EEXIST') {
            try {
                const stat = await promises_1.default.stat(lockPath);
                if (Date.now() - stat.mtime.getTime() > mtimeLimit) {
                    return setupMTimeEditor(lockPath);
                }
                else {
                    throw 'LOCKED';
                }
            }
            catch (e) {
                if (e.code === 'ENOENT') {
                    //This will run if the lock gets released after the EEXIST error is thrown but before the stat is checked.
                    //If this is the case, the lock acquisition should be retried.
                    return await lockFile(path);
                }
                else {
                    throw e;
                }
            }
        }
        else {
            throw e;
        }
    }
}
