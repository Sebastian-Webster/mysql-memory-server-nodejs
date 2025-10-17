import os from 'os';
import fs from 'fs';
import fsPromises from 'fs/promises'

async function main() {
    const originalPath = `${os.tmpdir()}/mysqlmsn`
    if (process.env.MOVE_MYSQLMSN_TO && fs.existsSync(originalPath) && originalPath !== process.env.MOVE_MYSQLMSN_TO) {
        console.log('Moving MySQLMSN directory to other path for GitHub Actions upload')
        await fsPromises.cp(originalPath, process.env.MOVE_MYSQLMSN_TO, {recursive: true, force: true, filter: source => !source.includes('.sock')})
        await fsPromises.rm(originalPath, {force: true, recursive: true, maxRetries: 50, retryDelay: 100})
    } else {
        console.log('Skipping MySQLMSN directory move as conditions are not met.')
    }
}

main()