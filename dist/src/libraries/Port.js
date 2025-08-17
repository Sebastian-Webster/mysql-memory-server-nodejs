"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerateRandomPort = GenerateRandomPort;
const crypto_1 = require("crypto");
function GenerateRandomPort() {
    //Min is inclusive and max is exclusive. Inclusive range would be 1025 - 65535
    return (0, crypto_1.randomInt)(1025, 65536);
}
