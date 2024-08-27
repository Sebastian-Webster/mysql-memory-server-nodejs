import * as https from 'https';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises'
import * as os from 'os';
import Logger from './Logger';
import AdmZip from 'adm-zip'
import { normalize as normalizePath } from 'path';
import { randomUUID, createHash } from 'crypto';
import { exec } from 'child_process';
import { lockSync, unlockSync } from 'proper-lockfile';
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
        exec(`tar -xf ${filepath} -C ${extractedPath}`, (error, stdout, stderr) => {
            if (error || stderr) {
                return reject(error || stderr)
            }
            resolve()
        })
    })
}

async function checksumIsValid(filepath: string, expectedChecksum: string): Promise<null | string> {
    const fileData = await fsPromises.readFile(filepath);

    const stringData = fileData.toString('binary')

    const fileChecksum = createHash('md5').update(stringData, 'binary').digest('hex')

    if (fileChecksum === expectedChecksum) return null

    return fileChecksum
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
    return new Promise((resolve, reject) => {
        const fileStream = fs.createWriteStream(downloadLocation);

        let error: Error;

        fileStream.on('open', () => {
            const request = https.get(url, (response) => {
                response.pipe(fileStream)
            })

            request.on('error', (err) => {
                error = err;
                logger.error(err)
                fileStream.close()
                fs.unlink(downloadLocation, () => {
                    reject(err.message);
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
            fileStream.end()
            fs.unlink(downloadLocation, () => {
                reject(err.message)
            })
        })
    })
}

function extractBinary(url: string, archiveLocation: string, extractedLocation: string, logger: Logger): Promise<string> {
    return new Promise(async (resolve, reject) => {
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
        const dirpath = `${os.tmpdir()}/mysqlmsn/binaries`
        logger.log('Binary path:', dirpath)
        await fsPromises.mkdir(dirpath, {recursive: true})

        const lastDashIndex = url.lastIndexOf('-')
        const fileExtension = url.slice(lastDashIndex).split('.').splice(1).join('.')

        if (options.downloadBinaryOnce) {
            const extractedPath = `${dirpath}/${version}`
            await fsPromises.mkdir(extractedPath, {recursive: true})

            const binaryPath = normalizePath(`${extractedPath}/mysql/bin/mysqld${process.platform === 'win32' ? '.exe' : ''}`)
            const archivePath = `${dirpath}/${version}.${fileExtension}`

            const binaryExists = fs.existsSync(binaryPath)

            if (binaryExists) {
                return resolve(binaryPath)
            }

            try {
                lockSync(extractedPath)
            } catch (e) {
                if (String(e).includes('Lock file is already being held')) {
                    logger.log('Waiting for lock for MySQL version', version)
                    await waitForLock(extractedPath, options)
                    logger.log('Lock is gone for version', version)
                    return resolve(binaryPath)
                }

                return reject(e)
            }

            //Code from this comment and below runs only if the lock has been successfully acquired

            try {
                await downloadFromCDN(url, archivePath, logger)
            } catch (e) {
                logger.error('An error occurred while downloading binary:', e)
                try {
                    unlockSync(extractedPath)
                    await fsPromises.rm(archivePath, {force: true, recursive: true})
                } catch (e) {
                    logger.error(e)
                } finally {
                    reject(e)
                }
            }

            if (options.validateChecksums) {
                const wrongChecksum = await checksumIsValid(archivePath, binaryInfo.checksum)
                if (wrongChecksum) {
                    throw new Error(`The checksum for the MySQL binary doesn't match the checksum in versions.json! Expected: ${binaryInfo.checksum} but got: ${wrongChecksum}`)
                }
            }

            try {
                await extractBinary(url, archivePath, extractedPath, logger)
            } catch (e) {
                logger.error('An error occurred while extracting binary:', e)
                try {
                    unlockSync(extractedPath)
                    await Promise.all([
                        fsPromises.rm(extractedPath, {force: true, recursive: true}),
                        fsPromises.rm(archivePath, {force: true, recursive: true})
                    ])
                } catch (e) {
                    logger.error(e)
                } finally {
                    reject(e)
                }
            }

            try {
                unlockSync(extractedPath)
            } catch (e) {
                logger.error('An error occurred while unlocking lock:', e)
                return reject(e)
            }

            return resolve(binaryPath)
        }

        const uuid = randomUUID()
        const zipFilepath = `${dirpath}/${uuid}.${fileExtension}`
        logger.log('Binary filepath:', zipFilepath)
        const extractedPath = `${dirpath}/${uuid}`

        try {
            await downloadFromCDN(url, zipFilepath, logger)
        } catch (e) {
            reject(e)
        }

        if (options.validateChecksums) {
            const wrongChecksum = await checksumIsValid(zipFilepath, binaryInfo.checksum)
            if (wrongChecksum) {
                reject(new Error(`The checksum for the MySQL binary doesn't match the checksum in versions.json! Expected: ${binaryInfo.checksum} but got: ${wrongChecksum}`))
            }
        }

        try {
            const binaryPath = await extractBinary(url, zipFilepath, extractedPath, logger)
            resolve(binaryPath)
        } catch (e) {
            reject(e)
        }
    })
}