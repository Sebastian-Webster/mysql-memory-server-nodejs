"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.waitForLock = waitForLock;
const proper_lockfile_1 = require("proper-lockfile");
function waitForLock(path, options) {
    return new Promise(async (resolve, reject) => {
        let retries = 0;
        while (retries <= options.lockRetries) {
            retries++;
            try {
                const locked = (0, proper_lockfile_1.checkSync)(path, { realpath: false });
                if (!locked) {
                    return resolve();
                }
                else {
                    await new Promise(resolve => setTimeout(resolve, options.lockRetryWait));
                }
            }
            catch (e) {
                return reject(e);
            }
        }
        reject(`lockRetries has been exceeded. Lock had not been released after ${options.lockRetryWait} * ${options.lockRetries} milliseconds.`);
    });
}
