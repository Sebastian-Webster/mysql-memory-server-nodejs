import * as http from 'http';
import * as fs from 'fs';

export default function Download(url: string, filepath: string): Promise<undefined> {
    return new Promise((resolve, reject) => {
        const fileStream = fs.createWriteStream(filepath);

        fileStream.on('open', () => {
            const request = http.get(url, (response) => {
                response.pipe(fileStream)
            })

            request.on('error', (err) => {
                fs.unlink(filepath, () => {
                    reject(err);
                })
            })
        })

        fileStream.on('finish', resolve)

        fileStream.on('error', (err) => {
            fs.unlink(filepath, () => {
                reject(err)
            })
        })
    })
}