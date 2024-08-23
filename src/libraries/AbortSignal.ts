const DBDestroySignal = new AbortController();

function abortSignal() {
    if (!DBDestroySignal.signal.aborted) {
        DBDestroySignal.abort('Process is exiting')
    }
}

process.on('beforeExit', abortSignal)
process.on('exit', abortSignal)

export default DBDestroySignal;