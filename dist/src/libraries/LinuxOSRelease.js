"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOnAlpineLinux = void 0;
const fs_1 = __importDefault(require("fs"));
const releaseDetails = {};
if (process.platform === 'linux') {
    const file = fs_1.default.readFileSync('/etc/os-release', 'utf8');
    const entries = file.split('\n');
    for (const entry of entries) {
        const [key, value] = entry.split('=');
        if (typeof key === 'string' && typeof value === 'string') {
            releaseDetails[key] = value.replaceAll('"', '');
        }
    }
}
exports.isOnAlpineLinux = process.platform === 'linux' && releaseDetails?.ID === 'alpine';
exports.default = releaseDetails;
