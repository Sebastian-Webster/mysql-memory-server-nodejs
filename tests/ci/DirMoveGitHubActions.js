// This is written in JavaScript to remove the need for ts-node / tsx on the old versions of Node we support (>=16.6.0).
// If/when we drop support for legacy versions of Node.js, this file can be rewritten in TypeScript.

const os = require('os')
const fs = require('fs')
const fsPromises = require('fs/promises')

async function moveFolder(startDir, endDir) {
    const dir = await fsPromises.readdir(startDir, { withFileTypes: true })

    for (const file of dir) {

        if (file.isSocket()) continue;

        if (file.isDirectory()) {
            const start = `${file.parentPath}/${file.name}`
            const dest = `${endDir}/${file.name}`
            await fsPromises.mkdir(dest, { recursive: true })
            await moveFiles(start, dest)
        } else {
            const start = `${file.parentPath}/${file.name}`
            const dest = `${endDir}/${file.name}`
            await fsPromises.rename(start, dest)
        }
    }

    await fsPromises.rmdir(startDir)
}

async function main() {
    const originalPath = `${os.tmpdir()}/mysqlmsn`
    if (process.env.MOVE_MYSQLMSN_TO && fs.existsSync(originalPath) && originalPath !== process.env.MOVE_MYSQLMSN_TO) {
        console.log('Moving MySQLMSN directory to other path for GitHub Actions upload')
        await fsPromises.mkdir(process.env.MOVE_MYSQLMSN_TO, { recursive: true })
        await moveFolder(originalPath, process.env.MOVE_MYSQLMSN_TO)
    } else {
        console.log('Skipping MySQLMSN directory move as conditions are not met.')
    }
}

main()