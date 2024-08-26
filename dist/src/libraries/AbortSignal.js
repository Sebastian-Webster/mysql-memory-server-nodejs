"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DBDestroySignal = new AbortController();
function abortSignal() {
    if (!DBDestroySignal.signal.aborted) {
        DBDestroySignal.abort('Process is exiting');
    }
}
process.on('beforeExit', abortSignal);
process.on('exit', abortSignal);
exports.default = DBDestroySignal;
