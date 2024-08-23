const DBDestroySignal = new AbortController();

process.on('beforeExit', () => {
    DBDestroySignal.abort('Process is exiting')
})

export default DBDestroySignal;