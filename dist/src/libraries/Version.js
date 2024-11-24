"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getBinaryURL;
const os = __importStar(require("os"));
const semver_1 = require("semver");
function getBinaryURL(versions, versionToGet = "9.x") {
    let availableVersions = versions;
    availableVersions = availableVersions.filter(v => v.arch === process.arch);
    if (availableVersions.length === 0)
        throw `No MySQL binary could be found for your CPU architecture: ${process.arch}`;
    availableVersions = availableVersions.filter(v => v.os === process.platform);
    if (availableVersions.length === 0)
        throw `No MySQL binary could be found for your OS: ${process.platform}`;
    availableVersions = availableVersions.filter(v => {
        const release = (0, semver_1.coerce)(os.release());
        if (!release)
            return false;
        return (0, semver_1.satisfies)(release.version, v.osKernelVersionsSupported);
    });
    if (availableVersions.length === 0)
        throw `No MySQL binary could be found that supports your OS version: ${os.release()} | ${os.version()}`;
    const wantedVersions = availableVersions.filter(v => (0, semver_1.satisfies)(v.version, versionToGet));
    if (wantedVersions.length === 0)
        throw `No MySQL binary could be found that meets your version requirement: ${versionToGet} for OS ${process.platform} version ${os.release()} on arch ${process.arch}. The available versions for download are: ${availableVersions.map(v => v.version)}`;
    //Sorts versions in descending order
    wantedVersions.sort((a, b) => a.version < b.version ? 1 : a.version === b.version ? 0 : -1);
    const v = wantedVersions[0];
    return {
        url: v.url,
        version: v.version
    };
}
