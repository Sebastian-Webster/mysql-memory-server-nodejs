import * as https from 'https';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises'
import * as os from 'os';
import Logger from './Logger';
import AdmZip from 'adm-zip'
import { normalize as normalizePath } from 'path';
import { randomUUID } from 'crypto';
import { exec } from 'child_process';
import { lockSync, checkSync } from 'proper-lockfile';
import { ServerOptions } from '../../types';

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

        fileStream.on('open', () => {
            const request = https.get(url, (response) => {
                response.pipe(fileStream)
            })

            request.on('error', (err) => {
                logger.error(err)
                fileStream.close()
                fs.unlink(downloadLocation, (err) => {
                    reject(err);
                })
            })
        })

        fileStream.on('finish', () => {
            resolve()
        })

        fileStream.on('error', (err) => {
            logger.error(err)
            fileStream.end()
            fs.unlink(downloadLocation, () => {
                reject(err)
            })
        })
    })
}

function extractBinary(url: string, archiveLocation: string, extractedLocation: string): Promise<string> {
    return new Promise(async (resolve, reject) => {
        const lastDashIndex = archiveLocation.lastIndexOf('-')
        const fileExtension = archiveLocation.slice(lastDashIndex).split('.').splice(1).join('.')

        await fsPromises.mkdir(extractedLocation, {recursive: true})

        if (fileExtension === 'zip') {
            //Only Windows MySQL files use the .zip extension
            const zip = new AdmZip(archiveLocation)
            const entries = zip.getEntries()
            let mysqldPath = '';
            for (const entry of entries) {
                if (entry.isDirectory) {
                    await fsPromises.mkdir(`${extractedLocation}/${entry.entryName}`, {recursive: true})
                } else {
                    if (entry.name === 'mysqld.exe') {
                        mysqldPath = entry.entryName
                    }

                    const data = await getZipData(entry)
                    await fsPromises.writeFile(`${extractedLocation}/${entry.entryName}`, data)
                }
            }
            return resolve(normalizePath(`${extractedLocation}/${mysqldPath}`))
        }

        handleTarExtraction(archiveLocation, extractedLocation).then(async () => {
            try {
                await fsPromises.rm(archiveLocation)
            } finally {
                resolve(`${extractedLocation}/${url.split('/').at(-1).replace(`.${fileExtension}`, '')}/bin/mysqld`)
            }
        }).catch(error => {
            reject(`An error occurred while extracting the tar file. Please make sure tar is installed and there is enough storage space for the extraction. The error was: ${error}`)
        })
    })
}

export function downloadBinary(url: string, options: ServerOptions, logger: Logger): Promise<string> {
    return new Promise(async (resolve, reject) => {
        const dirpath = `${os.tmpdir()}/mysqlmsn/binaries`
        logger.log('Binary path:', dirpath)
        await fsPromises.mkdir(dirpath, {recursive: true})

        const uuid = randomUUID()
        const lastDashIndex = url.lastIndexOf('-')
        const fileExtension = url.slice(lastDashIndex).split('.').splice(1).join('.')
        const zipFilepath = `${dirpath}/${uuid}.${fileExtension}`
        logger.log('Binary filepath:', zipFilepath)
        const extractedPath = `${dirpath}/${uuid}`

        try {
            await downloadFromCDN(url, zipFilepath, logger)
        } catch (e) {
            reject(e)
        }

        try {
            const binaryPath = await extractBinary(url, zipFilepath, extractedPath)
            resolve(binaryPath)
        } catch (e) {
            reject(e)
        }
    })
}