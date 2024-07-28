import * as https from 'https';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises'
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import Logger from './Logger';
import * as tar from 'tar';

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

export function downloadBinary(url: string, logger: Logger): Promise<string> {
    return new Promise(async (resolve, reject) => {
        const dirpath = `${os.tmpdir()}/mysqlmsn/binaries`
        logger.log('Binary path:', dirpath)
        await fsPromises.mkdir(dirpath, {recursive: true})

        const uuid = uuidv4()
        const zipFilepath = `${dirpath}/${uuid}.tar.gz`
        const extractedPath = `${dirpath}/${uuid}`

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

        fileStream.on('finish', async () => {
            logger.log('Extracting binary...')

            await fsPromises.mkdir(extractedPath)

            tar.extract({
                file: zipFilepath,
                cwd: extractedPath,
                onwarn: (code, message, data) => {
                    logger.warn('tar emitted warning:\ncode:', code, '\nmessage:', message, '\ndata:', data)
                },
                noMtime: true
            }).then(async () => {
                logger.log('Binary has been extracted')
                try {
                    await fsPromises.rm(zipFilepath)
                } finally {
                    resolve(`${extractedPath}/${url.split('/').at(-1).replace('.tar.gz', '')}/bin/mysqld`)
                }
            }).catch(error => {
                logger.error(error)
                reject(error)
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