import * as https from 'https';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises'
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import Logger from './Logger';
import { createGunzip } from 'zlib';

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

export function downloadBinary(url: string, logger: Logger): Promise<void> {
    return new Promise(async (resolve, reject) => {
        const dirpath = `${os.tmpdir()}/mysqlmsn/binaries`
        logger.log('Binary path:', dirpath)
        await fsPromises.mkdir(dirpath, {recursive: true})

        const uuid = uuidv4()
        const zipFilepath = `${dirpath}/${uuid}.tar.gz`
        const extractedFilepath = `${dirpath}/${uuid}.tar`

        const fileStream = fs.createWriteStream(zipFilepath);

        fileStream.on('open', () => {
            const request = https.get(url, (response) => {
                response.pipe(fileStream)
            })

            request.on('error', (err) => {
                logger.error(err)
                fileStream.end()
                fs.unlink(zipFilepath, () => {
                    reject(err);
                })
            })
        })

        fileStream.on('finish', () => {
            logger.log('Extracting binary...')

            const zipReadStream = fs.createReadStream(zipFilepath)
            const extractedWriteStream = fs.createWriteStream(extractedFilepath)

            zipReadStream.pipe(createGunzip()).pipe(extractedWriteStream)

            zipReadStream.on('error', (err) => {
                extractedWriteStream.end()
                fsPromises.unlink(zipFilepath)
                fsPromises.unlink(extractedFilepath)
                reject(err)
            })

            extractedWriteStream.on('error', (err) => {
                zipReadStream.close();
                fsPromises.unlink(zipFilepath)
                fsPromises.unlink(extractedFilepath)
                reject(err)
            })
            
            extractedWriteStream.on('finish', () => {
                logger.log('Finished extracting binary')
                resolve()
            })
        })

        fileStream.on('error', (err) => {
            logger.error(err)
            fileStream.end()
            fs.unlink(zipFilepath, () => {
                reject(err)
            })
        })
    })
}