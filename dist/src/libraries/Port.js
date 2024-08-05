"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerateRandomPort = GenerateRandomPort;
function GenerateRandomPort() {
    return Math.floor(Math.random() * (65535 - 1024) + 1025);
}
