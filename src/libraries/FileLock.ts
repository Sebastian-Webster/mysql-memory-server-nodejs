import fsPromises from 'fs/promises';
import { InternalServerOptions } from "../../types";

const mtimeUpdateIntervalTime = 2_000
const mtimeLimit = 10_000

export async function waitForLock(path: string, options: InternalServerOptions): Promise<void> {
    const lockPath = `${path}.lock`
    let retries = 0;

    do {
        retries++;
        try {
            const stat = await fsPromises.stat(lockPath)
            if (Date.now() - stat.mtime.getTime() > mtimeLimit) {
                return
            } else {
                await new Promise(resolve => setTimeout(resolve, options.lockRetryWait))
            }
        } catch (e) {
            if (e.code === 'ENOENT') {
                return
            } else {
                throw e
            }
        }
    } while(retries <= options.lockRetries)

    throw `lockRetries has been exceeded. Lock had not been released after ${options.lockRetryWait} * ${options.lockRetries} (${options.lockRetryWait * options.lockRetries}) milliseconds.`
}

function setupMTimeEditor(lockPath: string): () => Promise<void> {
    const interval = setInterval(async () => {
        try {
            const time = new Date();
            await fsPromises.utimes(lockPath, time, time)
        } catch {}
    }, mtimeUpdateIntervalTime)

    return async () => {
        clearInterval(interval)
        await fsPromises.rmdir(lockPath)
    }
}

export async function lockFile(path: string): Promise<() => Promise<void>> {
    const lockPath = `${path}.lock`
    try {
        await fsPromises.mkdir(lockPath)
        return setupMTimeEditor(lockPath)
    } catch (e) {
        if (e.code === 'EEXIST') {
            try {
                const stat = await fsPromises.stat(lockPath)
                if (Date.now() - stat.mtime.getTime() > mtimeLimit) {
                    return setupMTimeEditor(lockPath)
                } else {
                    throw 'LOCKED'
                }
            } catch (e) {
                if (e.code === 'ENOENT') {
                    //This will run if the lock gets released after the EEXIST error is thrown but before the stat is checked.
                    //If this is the case, the lock acquisition should be retried.
                    return await lockFile(path)
                } else {
                    throw e
                }
            }
        } else {
            throw e
        }
    }
}