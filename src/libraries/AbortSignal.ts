import { onExit } from 'signal-exit'

const DBDestroySignal = new AbortController();

function abortSignal() {
    if (!DBDestroySignal.signal.aborted) {
        DBDestroySignal.abort('Process is exiting')
    }
}

onExit(abortSignal)

export default DBDestroySignal;