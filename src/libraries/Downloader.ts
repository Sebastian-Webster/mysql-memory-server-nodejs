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
import { MySQLCDNArchivesBaseURL, MySQLCDNDownloadsBaseURL } from '../constants';
import os from 'os';

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

function getFileDownloadURLRedirect(url: string): Promise<string> {
    const options: https.RequestOptions = {
        headers: {
            'accept': '*/*',
            'connection': 'keep-alive'
        }
    }

    return new Promise((resolve, reject) => {
        const request = https.get(url, options, response => {
            const statusCode = response.statusCode
            const location = response.headers.location

            if (statusCode !== 302) {
                request.destroy();

                reject(`Received status code ${statusCode} while getting redirect URL for binary download. Used URL: ${url}`)
                return
            }

            if (typeof location === 'string' && location.length > 0) {
                request.destroy()
                resolve(location)
                return
            }

            request.destroy()
            reject(`Received incorrect URL information. Expected a non-empty string. Received: ${JSON.stringify(location)}`)
        })

        request.on('error', (err) => {
            request.destroy();
            reject(err.message)
        })
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
                    request.destroy();

                    fileStream.close((err) => {
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
                        request.end(() => {
                            if (!error) {
                                resolve()
                            }
                        })
                    })
                }
            })

            request.on('error', (err) => {
                error = err;
                logger.error(err)
                request.destroy();
                
                fileStream.close((fsErr) => {
                    if (fsErr) {
                        logger.error('An error occurred while closing the fileStream on request error. The error was:', fsErr)
                    }

                    fs.rm(downloadLocation, {force: true}, (rmError) => {
                        if (rmError) {
                            logger.error('An error occurred while deleting downloadLocation after an error occurred with the MySQL server binary download. The error was:', rmError)
                        }

                        reject(err.message);
                    })
                })
            })

            fileStream.on('error', (err) => {
                error = err;
                logger.error(err)
                request.destroy();

                fileStream.close((fsErr) => {
                    if (fsErr) {
                        logger.error('An error occurred while closing the fileStream on fileStream error. The error was:', fsErr)
                    }

                    fs.rm(downloadLocation, {force: true}, (rmError) => {
                        if (rmError) {
                            logger.error('An error occurred while deleting downloadLocation after an error occurred with the fileStream. The error was:', rmError)
                        }
    
                        reject(err.message)
                    })
                })
            })
        })
    })
}

function promisifiedZipExtraction(archiveLocation: string, extractedLocation: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const zip = new AdmZip(archiveLocation)
        zip.extractAllToAsync(extractedLocation, false, false, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve()
            }
        })
    })
}

function extractBinary(url: string, archiveLocation: string, extractedLocation: string, binaryInfo: BinaryInfo, logger: Logger): Promise<string> {
    return new Promise(async (resolve, reject) => {
        if (fs.existsSync(extractedLocation)) {
            logger.warn('Removing item at extractedLocation:', extractedLocation, 'so the MySQL binary can be stored there. This is probably because a previous download/extraction failed.')
            await fsPromises.rm(extractedLocation, {recursive: true, force: true})
        }

        const lastDashIndex = url.lastIndexOf('-')
        const fileExtension = url.slice(lastDashIndex).split('.').splice(1).join('.')

        await fsPromises.mkdir(extractedLocation, {recursive: true})

        let folderName = ''

        if (binaryInfo.hostedByOracle) {
            const splitURL = url.split('/')
            const mySQLFolderName = splitURL[splitURL.length - 1]
            if (!mySQLFolderName) {
                return reject(`Folder name is undefined for url: ${url}`)
            }
            folderName = mySQLFolderName.replace(`.${fileExtension}`, '')
        } else {
            folderName = `mysql-${binaryInfo.version}`
        }
        
        let extractionError: any = undefined;

        if (fileExtension === 'zip') {
            //Only Windows MySQL files use the .zip extension

            try {
                await promisifiedZipExtraction(archiveLocation, extractedLocation)
            } catch (e) {
                extractionError = e
                logger.log('An error occurred while extracting the ZIP file. The error was:', e)
            } finally {
                try {
                    await fsPromises.rm(archiveLocation)
                } catch (e) {
                    logger.error('A non-fatal error occurred while deleting archive location. The error was:', e)
                }
            }

            if (extractionError) {
                return reject(extractionError)
            }

            try {
                await fsPromises.rename(`${extractedLocation}/${folderName}`, `${extractedLocation}/mysql`)
            } catch (e) {
                logger.error('An error occurred while moving MySQL binary into correct folder (mysql folder). The error was:', e)
                return reject(e)
            }

            resolve(normalizePath(`${extractedLocation}/mysql/bin/mysqld.exe`))
        } else {
            try {
                await handleTarExtraction(archiveLocation, extractedLocation)
            } catch (e) {
                extractionError = e
                logger.error('An error occurred while extracting the tar file. Please make sure tar is installed and there is enough storage space for the extraction. The error was:', e)
            } finally {
                try {
                    await fsPromises.rm(archiveLocation)
                } catch (e) {
                    logger.error('A non-fatal error occurred while deleting archive location. The error was:', e)
                }
            }

            if (extractionError) {
                return reject(extractionError)
            }

            try {
                await fsPromises.rename(`${extractedLocation}/${folderName}`, `${extractedLocation}/mysql`)
            } catch (e) {
                logger.error('An error occurred while moving MySQL binary into correct folder (mysql folder). The error was:', e)
                return reject(e)
            }

            resolve(`${extractedLocation}/mysql/bin/mysqld`)
        }
    })
}

export function downloadBinary(binaryInfo: BinaryInfo, options: InternalServerOptions, logger: Logger): Promise<string> {
    return new Promise(async (resolve, reject) => {
        const {url, version} = binaryInfo;
        const dirpath = `${os.tmpdir()}/mysqlmsn/binaries`
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
                let downloadURL: string = 'UNINITIALISED'
                try {
                    downloadTries++;
                    downloadURL = binaryInfo.hostedByOracle ? `${useDownloadsURL ? MySQLCDNDownloadsBaseURL : MySQLCDNArchivesBaseURL}${url}` : await getFileDownloadURLRedirect(url)
                    logger.log(`Starting download for MySQL version ${version} from ${downloadURL}.`)
                    await downloadFromCDN(downloadURL, archivePath, logger)
                    logger.log(`Finished downloading MySQL version ${version} from ${downloadURL}. Now starting binary extraction.`)
                    await extractBinary(downloadURL, archivePath, extractedPath, binaryInfo, logger)
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

                    // If we got a 404 error while downloading a binary from Oracle and have not retried with the Downloads URL yet
                    // then retry with the Downloads URL. Otherwise, reject.
                    if (e?.includes('status code 404')) {
                        if (binaryInfo.hostedByOracle && useDownloadsURL === false) {
                            useDownloadsURL = true;
                            downloadTries--
                            continue
                        } else {
                            try {
                                await releaseFunction()
                            } catch (e) {
                                logger.error('An error occurred while releasing lock after receiving a 404 error on download. The error was:', e)
                            } finally {
                                return reject(`Binary download for MySQL version ${binaryInfo.version} returned status code 404 at URL ${downloadURL}. Aborting download.`)
                            }
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
                await releaseFunction()
            } catch (e) {
                logger.error('An error occurred while releasing lock after successful binary download. The error was:', e)
            }
            
            return resolve(binaryPath)
        } else {
            let downloadTries = 0;
            let useDownloadsURL = false;

            do {
                let downloadURL: string = 'UNINITIALISED'
                const uuid = randomUUID()
                const zipFilepath = `${dirpath}/${uuid}.${fileExtension}`
                logger.log('Binary filepath:', zipFilepath)
                const extractedPath = `${dirpath}/${uuid}`

                try {
                    downloadTries++
                    downloadURL = binaryInfo.hostedByOracle ? `${useDownloadsURL ? MySQLCDNDownloadsBaseURL : MySQLCDNArchivesBaseURL}${url}` : await getFileDownloadURLRedirect(url)
                    logger.log(`Starting download for MySQL version ${version} from ${downloadURL}.`)
                    await downloadFromCDN(downloadURL, zipFilepath, logger)
                    logger.log(`Finished downloading MySQL version ${version} from ${downloadURL}. Now starting binary extraction.`)
                    const binaryPath = await extractBinary(downloadURL, zipFilepath, extractedPath, binaryInfo, logger)
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

                    // If we got a 404 error while downloading a binary from Oracle and have not retried with the Downloads URL yet
                    // then retry with the Downloads URL. Otherwise, reject.
                    if (e?.includes('status code 404')) {
                        if (binaryInfo.hostedByOracle && useDownloadsURL === false) {
                            useDownloadsURL = true;
                            downloadTries--
                            continue
                        } else {
                            return reject(`Binary download for MySQL version ${binaryInfo.version} returned status code 404 at URL ${downloadURL}. Aborting download.`)
                        }
                    }

                    if (downloadTries > options.downloadRetries) {
                        //Only reject if we have met the downloadRetries limit
                        return reject(e)
                    } else {
                        logger.warn(`An error was encountered during the binary download process. Retrying for retry ${downloadTries}/${options.downloadRetries}. The error was:`, e)
                    }
                }
            } while (downloadTries <= options.downloadRetries)
        }
    })
}