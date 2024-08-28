import { checkSync } from "proper-lockfile";
import { InternalServerOptions } from "../../types";

export function waitForLock(path: string, options: InternalServerOptions): Promise<void> {
    return new Promise(async (resolve, reject) => {
        let retries = 0;
        while (retries <= options.lockRetries) {
            retries++
            try {
                const locked = checkSync(path, {realpath: false});
                if (!locked) {
                    return resolve()
                } else {
                    await new Promise(resolve => setTimeout(resolve, options.lockRetryWait))
                }
            } catch (e) {
                return reject(e)
            }
        }
        reject(`lockRetries has been exceeded. Lock had not been released after ${options.lockRetryWait} * ${options.lockRetries} milliseconds.`)
    })
}