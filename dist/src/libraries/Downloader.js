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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadVersions = downloadVersions;
exports.downloadBinary = downloadBinary;
const https = __importStar(require("https"));
const fs = __importStar(require("fs"));
const fsPromises = __importStar(require("fs/promises"));
const os = __importStar(require("os"));
const adm_zip_1 = __importDefault(require("adm-zip"));
const path_1 = require("path");
const crypto_1 = require("crypto");
const child_process_1 = require("child_process");
const proper_lockfile_1 = require("proper-lockfile");
function getZipData(entry) {
    return new Promise((resolve, reject) => {
        entry.getDataAsync((data, err) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(data);
            }
        });
    });
}
function handleTarExtraction(filepath, extractedPath) {
    return new Promise((resolve, reject) => {
        (0, child_process_1.exec)(`tar -xf ${filepath} -C ${extractedPath}`, (error, stdout, stderr) => {
            if (error || stderr) {
                return reject(error || stderr);
            }
            resolve();
        });
    });
}
function downloadVersions() {
    return new Promise((resolve, reject) => {
        let json = "";
        https.get("https://github.com/Sebastian-Webster/mysql-memory-server-nodejs/raw/main/versions.json", function (response) {
            response
                .on("data", append => json += append)
                .on("error", e => {
                reject(e);
            })
                .on("end", () => {
                resolve(json);
            });
        });
    });
}
function downloadFromCDN(url, downloadLocation, logger) {
    return new Promise((resolve, reject) => {
        const fileStream = fs.createWriteStream(downloadLocation);
        fileStream.on('open', () => {
            const request = https.get(url, (response) => {
                response.pipe(fileStream);
            });
            request.on('error', (err) => {
                logger.error(err);
                fileStream.close();
                fs.unlink(downloadLocation, (err) => {
                    reject(err);
                });
            });
        });
        fileStream.on('finish', () => {
            resolve();
        });
        fileStream.on('error', (err) => {
            logger.error(err);
            fileStream.end();
            fs.unlink(downloadLocation, () => {
                reject(err);
            });
        });
    });
}
function extractBinary(url, archiveLocation, extractedLocation) {
    return new Promise(async (resolve, reject) => {
        const lastDashIndex = url.lastIndexOf('-');
        const fileExtension = url.slice(lastDashIndex).split('.').splice(1).join('.');
        await fsPromises.mkdir(extractedLocation, { recursive: true });
        const folderName = url.split('/').at(-1).replace(`.${fileExtension}`, '');
        if (fileExtension === 'zip') {
            //Only Windows MySQL files use the .zip extension
            const zip = new adm_zip_1.default(archiveLocation);
            const entries = zip.getEntries();
            for (const entry of entries) {
                if (entry.entryName.indexOf('..') === -1) {
                    if (entry.isDirectory) {
                        if (entry.name === folderName) {
                            await fsPromises.mkdir(`${extractedLocation}/mysql`, { recursive: true });
                        }
                        else {
                            await fsPromises.mkdir(`${extractedLocation}/${entry.entryName}`, { recursive: true });
                        }
                    }
                    else {
                        const data = await getZipData(entry);
                        await fsPromises.writeFile(`${extractedLocation}/${entry.entryName}`, data);
                    }
                }
            }
            try {
                await fsPromises.rm(archiveLocation);
            }
            finally {
                fsPromises.rename(`${extractedLocation}/${folderName}`, `${extractedLocation}/mysql`);
                return resolve((0, path_1.normalize)(`${extractedLocation}/mysql/bin/mysqld.exe`));
            }
        }
        handleTarExtraction(archiveLocation, extractedLocation).then(async () => {
            try {
                await fsPromises.rm(archiveLocation);
            }
            finally {
                fsPromises.rename(`${extractedLocation}/${folderName}`, `${extractedLocation}/mysql`);
                resolve(`${extractedLocation}/mysql/bin/mysqld`);
            }
        }).catch(error => {
            reject(`An error occurred while extracting the tar file. Please make sure tar is installed and there is enough storage space for the extraction. The error was: ${error}`);
        });
    });
}
function waitForLock(path, options) {
    return new Promise(async (resolve, reject) => {
        let retries = 0;
        while (retries <= options.lockRetries) {
            retries++;
            try {
                const locked = (0, proper_lockfile_1.checkSync)(path);
                if (!locked) {
                    return resolve();
                }
                else {
                    await new Promise(resolve => setTimeout(resolve, options.lockRetryWait));
                }
            }
            catch (e) {
                return reject(e);
            }
        }
        reject(`lockRetries has been exceeded. Lock had not been released after ${options.lockRetryWait} * ${options.lockRetries} milliseconds.`);
    });
}
function downloadBinary(binaryInfo, options, logger) {
    return new Promise(async (resolve, reject) => {
        const { url, version } = binaryInfo;
        const dirpath = `${os.tmpdir()}/mysqlmsn/binaries`;
        logger.log('Binary path:', dirpath);
        await fsPromises.mkdir(dirpath, { recursive: true });
        const lastDashIndex = url.lastIndexOf('-');
        const fileExtension = url.slice(lastDashIndex).split('.').splice(1).join('.');
        if (options.downloadBinaryOnce) {
            const extractedPath = `${dirpath}/${version}`;
            await fsPromises.mkdir(extractedPath, { recursive: true });
            const binaryPath = (0, path_1.normalize)(`${extractedPath}/mysql/bin/mysqld${process.platform === 'win32' ? '.exe' : ''}`);
            const binaryExists = fs.existsSync(binaryPath);
            if (binaryExists) {
                return resolve(binaryPath);
            }
            try {
                (0, proper_lockfile_1.lockSync)(extractedPath);
                const archivePath = `${dirpath}/${version}.${fileExtension}`;
                await downloadFromCDN(url, archivePath, logger);
                await extractBinary(url, archivePath, extractedPath);
                try {
                    (0, proper_lockfile_1.unlockSync)(extractedPath);
                }
                catch (e) {
                    return reject(e);
                }
                return resolve(binaryPath);
            }
            catch (e) {
                if (String(e) === 'Error: Lock file is already being held') {
                    logger.log('Waiting for lock for MySQL version', version);
                    await waitForLock(extractedPath, options);
                    logger.log('Lock is gone for version', version);
                    return resolve(binaryPath);
                }
                return reject(e);
            }
        }
        const uuid = (0, crypto_1.randomUUID)();
        const zipFilepath = `${dirpath}/${uuid}.${fileExtension}`;
        logger.log('Binary filepath:', zipFilepath);
        const extractedPath = `${dirpath}/${uuid}`;
        try {
            await downloadFromCDN(url, zipFilepath, logger);
        }
        catch (e) {
            reject(e);
        }
        try {
            const binaryPath = await extractBinary(url, zipFilepath, extractedPath);
            resolve(binaryPath);
        }
        catch (e) {
            reject(e);
        }
    });
}
