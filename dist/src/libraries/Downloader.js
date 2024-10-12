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
const adm_zip_1 = __importDefault(require("adm-zip"));
const path_1 = require("path");
const crypto_1 = require("crypto");
const child_process_1 = require("child_process");
const proper_lockfile_1 = require("proper-lockfile");
const FileLock_1 = require("./FileLock");
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
        (0, child_process_1.execFile)(`tar`, ['-xf', filepath, '-C', extractedPath], (error, stdout, stderr) => {
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
    return new Promise(async (resolve, reject) => {
        if (fs.existsSync(downloadLocation)) {
            logger.warn('Removing item at downloadLocation:', downloadLocation, 'so the MySQL binary archive can be stored there. This is probably because a previous download/extraction failed.');
            await fsPromises.rm(downloadLocation, { recursive: true, force: true });
        }
        const fileStream = fs.createWriteStream(downloadLocation);
        let error;
        fileStream.on('open', () => {
            const request = https.get(url, (response) => {
                if (response.statusCode !== 200) {
                    fileStream.close((err) => {
                        if (err) {
                            logger.error('An error occurred while closing the fileStream for non-200 status code. The error was:', err);
                        }
                        fs.unlink(downloadLocation, (unlinkErr) => {
                            if (unlinkErr) {
                                logger.error('An error occurred while deleting downloadLocation after non-200 status code download attempt. The error was:', err);
                            }
                            logger.error('Received status code:', response.statusCode, 'while downloading MySQL binary.');
                            reject(`Received status code ${response.statusCode} while downloading MySQL binary.`);
                        });
                    });
                }
                else {
                    response.pipe(fileStream);
                    fileStream.on('finish', () => {
                        if (!error) {
                            resolve();
                        }
                    });
                }
            });
            request.on('error', (err) => {
                error = err;
                logger.error(err);
                fileStream.end(() => {
                    fs.unlink(downloadLocation, (unlinkError) => {
                        if (unlinkError) {
                            logger.error('An error occurred while deleting downloadLocation after an error occurred with the MySQL server binary download. The error was:', unlinkError);
                        }
                        reject(err.message);
                    });
                });
            });
        });
        fileStream.on('error', (err) => {
            error = err;
            logger.error(err);
            fileStream.end(() => {
                fs.unlink(downloadLocation, (unlinkError) => {
                    if (unlinkError) {
                        logger.error('An error occurred while deleting downloadLocation after an error occurred with the fileStream. The error was:', unlinkError);
                    }
                    reject(err.message);
                });
            });
        });
    });
}
function extractBinary(url, archiveLocation, extractedLocation, logger) {
    return new Promise(async (resolve, reject) => {
        if (fs.existsSync(extractedLocation)) {
            logger.warn('Removing item at extractedLocation:', extractedLocation, 'so the MySQL binary can be stored there. This is probably because a previous download/extraction failed.');
            await fsPromises.rm(extractedLocation, { recursive: true, force: true });
        }
        const lastDashIndex = url.lastIndexOf('-');
        const fileExtension = url.slice(lastDashIndex).split('.').splice(1).join('.');
        await fsPromises.mkdir(extractedLocation, { recursive: true });
        const mySQLFolderName = url.split('/').at(-1);
        if (!mySQLFolderName) {
            return reject(`Folder name is undefined for url: ${url}`);
        }
        const folderName = mySQLFolderName.replace(`.${fileExtension}`, '');
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
            catch (e) {
                logger.error('A non-fatal error occurred while removing no longer needed archive file:', e);
            }
            finally {
                await fsPromises.rename(`${extractedLocation}/${folderName}`, `${extractedLocation}/mysql`);
                return resolve((0, path_1.normalize)(`${extractedLocation}/mysql/bin/mysqld.exe`));
            }
        }
        handleTarExtraction(archiveLocation, extractedLocation).then(async () => {
            try {
                await fsPromises.rm(archiveLocation);
            }
            catch (e) {
                logger.error('A non-fatal error occurred while removing no longer needed archive file:', e);
            }
            finally {
                await fsPromises.rename(`${extractedLocation}/${folderName}`, `${extractedLocation}/mysql`);
                resolve(`${extractedLocation}/mysql/bin/mysqld`);
            }
        }).catch(error => {
            logger.error(`An error occurred while extracting the tar file. Please make sure tar is installed and there is enough storage space for the extraction. The error was: ${error}`);
            reject(error);
        });
    });
}
function downloadBinary(binaryInfo, options, logger) {
    return new Promise(async (resolve, reject) => {
        const { url, version } = binaryInfo;
        const dirpath = options.binaryDirectoryPath;
        logger.log('Binary path:', dirpath);
        await fsPromises.mkdir(dirpath, { recursive: true });
        const lastDashIndex = url.lastIndexOf('-');
        const fileExtension = url.slice(lastDashIndex).split('.').splice(1).join('.');
        if (options.downloadBinaryOnce) {
            const extractedPath = `${dirpath}/${version}`;
            const binaryPath = (0, path_1.normalize)(`${extractedPath}/mysql/bin/mysqld${process.platform === 'win32' ? '.exe' : ''}`);
            const archivePath = `${dirpath}/${version}.${fileExtension}`;
            const binaryExists = fs.existsSync(binaryPath);
            if (binaryExists) {
                return resolve(binaryPath);
            }
            let releaseFunction;
            while (true) {
                try {
                    releaseFunction = (0, proper_lockfile_1.lockSync)(extractedPath, { realpath: false });
                    break;
                }
                catch (e) {
                    if (e.code === 'ELOCKED') {
                        logger.log('Waiting for lock for MySQL version', version);
                        await (0, FileLock_1.waitForLock)(extractedPath, options);
                        logger.log('Lock is gone for version', version);
                        //If the binary does not exist after lock has been released (like if the download fails and the binary got deleted as a result)
                        //then the lock acquisition process should start again
                        const binaryExists = fs.existsSync(binaryPath);
                        if (!binaryExists)
                            continue;
                        return resolve(binaryPath);
                    }
                    return reject(e);
                }
            }
            //The code below only runs if the lock has been acquired by us
            let downloadTries = 0;
            do {
                try {
                    downloadTries++;
                    await downloadFromCDN(url, archivePath, logger);
                    await extractBinary(url, archivePath, extractedPath, logger);
                    break;
                }
                catch (e) {
                    //Delete generated files since either download or extraction failed
                    try {
                        await Promise.all([
                            fsPromises.rm(extractedPath, { force: true, recursive: true }),
                            fsPromises.rm(archivePath, { force: true, recursive: true })
                        ]);
                    }
                    catch (e) {
                        logger.error('An error occurred while deleting extractedPath and/or archivePath:', e);
                    }
                    if (downloadTries >= options.downloadRetries) {
                        //Only reject if we have met the downloadRetries limit
                        try {
                            releaseFunction();
                        }
                        catch (e) {
                            logger.error('An error occurred while releasing lock after downloadRetries exhaustion. The error was:', e);
                        }
                        logger.error('downloadRetries have been exceeded. Aborting download.');
                        return reject(e);
                    }
                    else {
                        console.warn(`An error was encountered during the binary download process. Retrying for retry ${downloadTries}/${options.downloadRetries}. The error was:`, e);
                    }
                }
            } while (downloadTries < options.downloadRetries);
            try {
                releaseFunction();
            }
            catch (e) {
                logger.error('An error occurred while releasing lock after successful binary download. The error was:', e);
            }
            return resolve(binaryPath);
        }
        else {
            let downloadTries = 0;
            do {
                const uuid = (0, crypto_1.randomUUID)();
                const zipFilepath = `${dirpath}/${uuid}.${fileExtension}`;
                logger.log('Binary filepath:', zipFilepath);
                const extractedPath = `${dirpath}/${uuid}`;
                try {
                    downloadTries++;
                    await downloadFromCDN(url, zipFilepath, logger);
                    const binaryPath = await extractBinary(url, zipFilepath, extractedPath, logger);
                    return resolve(binaryPath);
                }
                catch (e) {
                    //Delete generated files since either download or extraction failed
                    try {
                        await Promise.all([
                            fsPromises.rm(extractedPath, { force: true, recursive: true }),
                            fsPromises.rm(zipFilepath, { force: true, recursive: true })
                        ]);
                    }
                    catch (e) {
                        logger.error('An error occurred while deleting extractedPath and/or archivePath:', e);
                    }
                    if (downloadTries >= options.downloadRetries) {
                        //Only reject if we have met the downloadRetries limit
                        return reject(e);
                    }
                    else {
                        console.warn(`An error was encountered during the binary download process. Retrying for retry ${downloadTries}/${options.downloadRetries}. The error was:`, e);
                    }
                }
            } while (downloadTries < options.downloadRetries);
        }
    });
}
