import fsPromises from 'fs/promises';
import { InternalServerOptions } from "../../types";

export async function waitForLock(path: string, options: InternalServerOptions): Promise<void> {
    const lockPath = `${path}.lock`
    let retries = 0;
    do {
        retries++;
        try {
            const stat = await fsPromises.stat(lockPath)
            if (performance.now() - stat.mtime.getTime() > 10_000) {
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
}

function setupMTimeEditor(lockPath: string): () => Promise<void> {
    const interval = setInterval(async () => {
        try {
            const time = performance.now();
            await fsPromises.utimes(lockPath, time, time)
        } catch {}
    }, 2_000)

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
            const stat = await fsPromises.stat(lockPath)
            if (performance.now() - stat.mtime.getTime() > 10_000) {
                return setupMTimeEditor(lockPath)
            } else {
                throw 'LOCKED'
            }
        } else {
            throw e
        }
    }
}