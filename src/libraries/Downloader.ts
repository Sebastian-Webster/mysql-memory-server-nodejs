import * as https from 'https';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises'
import Logger from './Logger';
import AdmZip from 'adm-zip'
import { normalize as normalizePath } from 'path';
import { randomUUID } from 'crypto';
import { execFile } from 'child_process';
import { lockSync } from 'proper-lockfile';
import { BinaryInfo, InternalServerOptions } from '../../types';
import { waitForLock } from './FileLock';

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
                response.pipe(fileStream)
            })

            request.on('error', (err) => {
                error = err;
                logger.error(err)
                fileStream.end(() => {
                    fs.unlink(downloadLocation, (unlinkError) => {
                        if (unlinkError) {
                            logger.error('An error occurred while deleting downloadLocation after an error occurred with the MySQL server binary download. The error was:', unlinkError)
                        }
                        reject(err.message);
                    })
                })
            })
        })

        fileStream.on('finish', () => {
            if (!error) {
                resolve()
            }
        })

        fileStream.on('error', (err) => {
            error = err;
            logger.error(err)
            fileStream.end(() => {
                fs.unlink(downloadLocation, (unlinkError) => {
                    if (unlinkError) {
                        logger.error('An error occurred while deleting downloadLocation after an error occurred with the fileStream. The error was:', unlinkError)
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

        if (fileExtension === 'zip') {
            //Only Windows MySQL files use the .zip extension
            const zip = new AdmZip(archiveLocation)
            const entries = zip.getEntries()
            for (const entry of entries) {
                if (entry.entryName.indexOf('..') === -1) {
                    if (entry.isDirectory) {
                        if (entry.name === folderName) {
                            await fsPromises.mkdir(`${extractedLocation}/mysql`, {recursive: true})
                        } else {
                            await fsPromises.mkdir(`${extractedLocation}/${entry.entryName}`, {recursive: true})
                        }
                    } else {
                        const data = await getZipData(entry)
                        await fsPromises.writeFile(`${extractedLocation}/${entry.entryName}`, data)
                    }
                }
            }
            try {
                await fsPromises.rm(archiveLocation)
            } catch (e) {
                logger.error('A non-fatal error occurred while removing no longer needed archive file:', e)  
            } finally {
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
            reject(`An error occurred while extracting the tar file. Please make sure tar is installed and there is enough storage space for the extraction. The error was: ${error}`)
        })
    })
}

export function downloadBinary(binaryInfo: BinaryInfo, options: InternalServerOptions, logger: Logger): Promise<string> {
    return new Promise(async (resolve, reject) => {
        const {url, version} = binaryInfo;
        const dirpath = options.binaryDirectoryPath
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

            let releaseFunction: () => void;

            while (true) {
                try {
                    releaseFunction = lockSync(extractedPath, {realpath: false})
                    break
                } catch (e) {
                    if (e.code === 'ELOCKED') {
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

            do {
                try {
                    downloadTries++;
                    await downloadFromCDN(url, archivePath, logger)
                    await extractBinary(url, archivePath, extractedPath, logger)
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

                    if (downloadTries >= options.downloadRetries) {
                        //Only reject if we have met the downloadRetries limit
                        try {
                            releaseFunction()
                        } catch (e) {
                            logger.error('An error occurred while releasing lock after downloadRetries exhaustion. The error was:', e)
                        }
                        return reject(e)
                    } else {
                        console.warn(`An error was encountered during the binary download process. Retrying for retry ${downloadTries}/${options.downloadRetries}. The error was:`, e)
                    }
                }
            } while (downloadTries < options.downloadRetries)

            try {
                releaseFunction()
            } catch (e) {
                return reject(e)
            }
            
            return resolve(binaryPath)
        }

        let downloadTries = 0;

        do {
            const uuid = randomUUID()
            const zipFilepath = `${dirpath}/${uuid}.${fileExtension}`
            logger.log('Binary filepath:', zipFilepath)
            const extractedPath = `${dirpath}/${uuid}`

            try {
                downloadTries++
                await downloadFromCDN(url, zipFilepath, logger)
                const binaryPath = await extractBinary(url, zipFilepath, extractedPath, logger)
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

                if (downloadTries >= options.downloadRetries) {
                    //Only reject if we have met the downloadRetries limit
                    return reject(e)
                } else {
                    console.warn(`An error was encountered during the binary download process. Retrying for retry ${downloadTries}/${options.downloadRetries}. The error was:`, e)
                }
            }
        } while (downloadTries < options.downloadRetries)
    })
}