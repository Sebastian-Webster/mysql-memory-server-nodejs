import * as https from 'https';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises'
import Logger from './Logger';
import AdmZip from 'adm-zip'
import { normalize as normalizePath } from 'path';
import { randomUUID } from 'crypto';
import { execFile } from 'child_process';
import { BinaryInfo, InternalServerOptions } from '../../types';
import { lockFile, waitForLock } from './FileLock';
import { archiveBaseURL, downloadsBaseURL, getInternalEnvVariable } from '../constants';

function getZipData(entry: AdmZip.IZipEntry): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        entry.getDataAsync((data, err) => {
            if (err) {
                reject(err)
            } else {
                resolve(data)
            }
        })
    })
}

function handleTarExtraction(filepath: string, extractedPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        execFile(`tar`, ['-xf', filepath, '-C', extractedPath], (error, stdout, stderr) => {
            if (error || stderr) {
                return reject(error || stderr)
            }
            resolve()
        })
    })
}

export function downloadVersions(): Promise<string> {
    return new Promise((resolve, reject) => {
        let json = "";

        https.get("https://github.com/Sebastian-Webster/mysql-memory-server-nodejs/raw/main/versions.json", function(response) {
            response
            .on("data", append => json += append )
            .on("error", e => {
                reject(e)
            } )
            .on("end", ()=>{
                resolve(json)
            } );
        });
    })
}

function downloadFromCDN(url: string, downloadLocation: string, logger: Logger): Promise<void> {
    return new Promise(async (resolve, reject) => {
        if (fs.existsSync(downloadLocation)) {
            logger.warn('Removing item at downloadLocation:', downloadLocation, 'so the MySQL binary archive can be stored there. This is probably because a previous download/extraction failed.')
            await fsPromises.rm(downloadLocation, {recursive: true, force: true})
        }

        const fileStream = fs.createWriteStream(downloadLocation);

        let error: Error;

        fileStream.on('open', () => {
            const request = https.get(url, (response) => {
                if (response.statusCode !== 200) {
                    fileStream.end((err) => {
                        if (err) {
                            logger.error('An error occurred while closing the fileStream for non-200 status code. The error was:', err)
                        }

                        fs.rm(downloadLocation, {force: true}, (rmError) => {
                            if (rmError) {
                                logger.error('An error occurred while deleting downloadLocation after non-200 status code download attempt. The error was:', rmError)
                            }

                            reject(`Received status code ${response.statusCode} while downloading MySQL binary.`)
                        })
                    })
                } else {
                    response.pipe(fileStream)
                    fileStream.on('finish', () => {
                        if (!error) {
                            resolve()
                        }
                    })
                }
            })

            request.on('error', (err) => {
                error = err;
                logger.error(err)
                fileStream.end(() => {
                    fs.rm(downloadLocation, {force: true}, (rmError) => {
                        if (rmError) {
                            logger.error('An error occurred while deleting downloadLocation after an error occurred with the MySQL server binary download. The error was:', rmError)
                        }
                        reject(err.message);
                    })
                })
            })
        })

        fileStream.on('error', (err) => {
            error = err;
            logger.error(err)
            fileStream.end(() => {
                fs.rm(downloadLocation, {force: true}, (rmError) => {
                    if (rmError) {
                        logger.error('An error occurred while deleting downloadLocation after an error occurred with the fileStream. The error was:', rmError)
                    }
                    reject(err.message)
                })
            })
        })
    })
}

function extractBinary(url: string, archiveLocation: string, extractedLocation: string, logger: Logger): Promise<string> {
    return new Promise(async (resolve, reject) => {
        if (fs.existsSync(extractedLocation)) {
            logger.warn('Removing item at extractedLocation:', extractedLocation, 'so the MySQL binary can be stored there. This is probably because a previous download/extraction failed.')
            await fsPromises.rm(extractedLocation, {recursive: true, force: true})
        }

        const lastDashIndex = url.lastIndexOf('-')
        const fileExtension = url.slice(lastDashIndex).split('.').splice(1).join('.')

        await fsPromises.mkdir(extractedLocation, {recursive: true})

        const mySQLFolderName = url.split('/').at(-1)
        if (!mySQLFolderName) {
            return reject(`Folder name is undefined for url: ${url}`)
        }
        const folderName = mySQLFolderName.replace(`.${fileExtension}`, '')
        
        console.log('The MySQL folder:', folderName, 'will be renamed.')

        if (fileExtension === 'zip') {
            //Only Windows MySQL files use the .zip extension
            const zip = new AdmZip(archiveLocation)
            
            zip.extractAllToAsync(extractedLocation, true, true, (err) => {throw err;})

            try {
                await fsPromises.rm(archiveLocation)
            } catch (e) {
                logger.error('A non-fatal error occurred while removing no longer needed archive file:', e)  
            } finally {
                logger.log('readdir:', fs.readdirSync(extractedLocation))
                await fsPromises.rename(`${extractedLocation}/${folderName}`, `${extractedLocation}/mysql`)
                return resolve(normalizePath(`${extractedLocation}/mysql/bin/mysqld.exe`))
            }
        }

        handleTarExtraction(archiveLocation, extractedLocation).then(async () => {
            try {
                await fsPromises.rm(archiveLocation)
            } catch (e) {
                logger.error('A non-fatal error occurred while removing no longer needed archive file:', e)  
            } finally {
                await fsPromises.rename(`${extractedLocation}/${folderName}`, `${extractedLocation}/mysql`)
                resolve(`${extractedLocation}/mysql/bin/mysqld`)
            }
        }).catch(error => {
            logger.error(`An error occurred while extracting the tar file. Please make sure tar is installed and there is enough storage space for the extraction. The error was: ${error}`)
            reject(error)
        })
    })
}

export function downloadBinary(binaryInfo: BinaryInfo, options: InternalServerOptions, logger: Logger): Promise<string> {
    return new Promise(async (resolve, reject) => {
        const {url, version} = binaryInfo;
        const dirpath = getInternalEnvVariable('binaryDirectoryPath')
        logger.log('Binary path:', dirpath)
        await fsPromises.mkdir(dirpath, {recursive: true})

        const lastDashIndex = url.lastIndexOf('-')
        const fileExtension = url.slice(lastDashIndex).split('.').splice(1).join('.')

        if (options.downloadBinaryOnce) {
            const extractedPath = `${dirpath}/${version}`

            const binaryPath = normalizePath(`${extractedPath}/mysql/bin/mysqld${process.platform === 'win32' ? '.exe' : ''}`)
            const archivePath = `${dirpath}/${version}.${fileExtension}`

            const binaryExists = fs.existsSync(binaryPath)

            if (binaryExists) {
                return resolve(binaryPath)
            }

            let releaseFunction: () => Promise<void>;

            while (true) {
                try {
                    releaseFunction = await lockFile(extractedPath)
                    break
                } catch (e) {
                    if (e === 'LOCKED') {
                        logger.log('Waiting for lock for MySQL version', version)
                        await waitForLock(extractedPath, options)
                        logger.log('Lock is gone for version', version)

                        //If the binary does not exist after lock has been released (like if the download fails and the binary got deleted as a result)
                        //then the lock acquisition process should start again
                        const binaryExists = fs.existsSync(binaryPath)
                        if (!binaryExists) continue

                        return resolve(binaryPath)
                    }
    
                    return reject(e)
                }
            }

            //The code below only runs if the lock has been acquired by us

            let downloadTries = 0;
            let useDownloadsURL = false;

            do {
                try {
                    downloadTries++;
                    const downloadURL = useDownloadsURL ? url.replace(archiveBaseURL, downloadsBaseURL) : url
                    logger.log(`Starting download for MySQL version ${version} from ${downloadURL}.`)
                    await downloadFromCDN(downloadURL, archivePath, logger)
                    logger.log(`Finished downloading MySQL version ${version} from ${downloadURL}. Now starting binary extraction.`)
                    await extractBinary(downloadURL, archivePath, extractedPath, logger)
                    logger.log(`Finished extraction for version ${version}`)
                    break
                } catch (e) {
                    //Delete generated files since either download or extraction failed
                    try {
                        await Promise.all([
                            fsPromises.rm(extractedPath, {force: true, recursive: true}),
                            fsPromises.rm(archivePath, {force: true, recursive: true})
                        ])
                    } catch (e) {
                        logger.error('An error occurred while deleting extractedPath and/or archivePath:', e)
                    }

                    if (e?.includes?.('status code 404')) {
                        if (!useDownloadsURL) {
                            //Retry with downloads URL
                            downloadTries--;
                            useDownloadsURL = true;
                            logger.log(`Encountered error 404 when using archives URL for version ${version}. Now retrying with the downloads URL.`)
                            continue;
                        } else {
                            try {
                                await releaseFunction()
                            } catch (e) {
                                logger.error('An error occurred while releasing lock after receiving a 404 error on both downloads and archives URLs. The error was:', e)
                            }

                            return reject(`Both URLs for MySQL version ${binaryInfo.version} returned status code 404. Aborting download.`)
                        }
                    }

                    if (downloadTries > options.downloadRetries) {
                        //Only reject if we have met the downloadRetries limit
                        try {
                            await releaseFunction()
                        } catch (e) {
                            logger.error('An error occurred while releasing lock after downloadRetries exhaustion. The error was:', e)
                        }
                        logger.error('downloadRetries have been exceeded. Aborting download.')
                        return reject(e)
                    } else {
                        logger.warn(`An error was encountered during the binary download process. Retrying for retry ${downloadTries}/${options.downloadRetries}. The error was:`, e)
                    }
                }
            } while (downloadTries <= options.downloadRetries)

            try {
                releaseFunction()
            } catch (e) {
                logger.error('An error occurred while releasing lock after successful binary download. The error was:', e)
            }
            
            return resolve(binaryPath)
        } else {
            let downloadTries = 0;
            let useDownloadsURL = false;

            do {
                const uuid = randomUUID()
                const zipFilepath = `${dirpath}/${uuid}.${fileExtension}`
                logger.log('Binary filepath:', zipFilepath)
                const extractedPath = `${dirpath}/${uuid}`

                try {
                    downloadTries++
                    const downloadURL = useDownloadsURL ? url.replace(archiveBaseURL, downloadsBaseURL) : url
                    logger.log(`Starting download for MySQL version ${version} from ${downloadURL}.`)
                    await downloadFromCDN(downloadURL, zipFilepath, logger)
                    logger.log(`Finished downloading MySQL version ${version} from ${downloadURL}. Now starting binary extraction.`)
                    const binaryPath = await extractBinary(downloadURL, zipFilepath, extractedPath, logger)
                    logger.log(`Finished extraction for version ${version}`)
                    return resolve(binaryPath)
                } catch (e) {
                    //Delete generated files since either download or extraction failed
                    try {
                        await Promise.all([
                            fsPromises.rm(extractedPath, {force: true, recursive: true}),
                            fsPromises.rm(zipFilepath, {force: true, recursive: true})
                        ])
                    } catch (e) {
                        logger.error('An error occurred while deleting extractedPath and/or archivePath:', e)
                    }

                    if (e?.includes?.('status code 404')) {
                        if (!useDownloadsURL) {
                            //Retry with downloads URL
                            downloadTries--;
                            useDownloadsURL = true;
                            logger.log(`Encountered error 404 when using archives URL for version ${version}. Now retrying with the downloads URL.`)
                            continue;
                        } else {
                            return reject(`Both URLs for MySQL version ${binaryInfo.version} returned status code 404. Aborting download.`)
                        }
                    }

                    if (downloadTries > options.downloadRetries) {
                        //Only reject if we have met the downloadRetries limit
                        return reject(e)
                    } else {
                        console.warn(`An error was encountered during the binary download process. Retrying for retry ${downloadTries}/${options.downloadRetries}. The error was:`, e)
                    }
                }
            } while (downloadTries <= options.downloadRetries)
        }
    })
}