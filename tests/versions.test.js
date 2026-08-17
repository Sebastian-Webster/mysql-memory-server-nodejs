// This test is written in JavaScript and using 'dist' as it's source because if it wasn't, Babel would be required.
// At the time of writing, Babel only supports Node ^20 or >=22 (and errors on anything that isn't that) and we support Node >=16.6.0.
// If/when we drop support for these legacy Node versions, this file can be changed back to TS and use 'src' for the source files.

const { expect, test } = require('@jest/globals')
const { createDB } = require('../dist/src/index.js')
const sql = require('mysql2/promise')
const { coerce, satisfies } = require('semver')
const { default: getBinaryURL } = require('../dist/src/libraries/Version.js')
const { DOWNLOADABLE_MYSQL_VERSIONS } = require('../dist/src/constants.js')
const fs = require('fs')
const os = require('os')
const { randomUUID } = require('crypto')

const usernames = ['root', 'dbuser']

jest.setTimeout(500_000); //5 minutes

const arch = process.arch === 'x64' || (process.platform === 'win32' && process.arch === 'arm64') ? 'x64' : 'arm64';

const versionRequirement = process.env.VERSION_REQUIREMENT || '>0.0.0'
console.log('Running versions test with versionRequirement:', versionRequirement)

const initSQLFilePath = `${os.tmpdir()}/mysqlmsn-init-file-${randomUUID()}`
fs.writeFileSync(initSQLFilePath, 'CREATE DATABASE initfromsqlfilepath;', 'utf-8')

for (const version of DOWNLOADABLE_MYSQL_VERSIONS.filter(v => satisfies(v, versionRequirement))) {
    try {
        getBinaryURL(version, arch)
    } catch (e) {
        console.warn(`Skipping version ${version} because the version is not supported on this system. The reason given from getBinaryURL was: ${e}`)
        continue
    }

    for (const username of usernames) {
        test(`running on version ${version} with username ${username}`, async () => {
            const options = {
                version,
                dbName: 'testingdata',
                username: username,
                logLevel: 'LOG',
                initSQLString: 'CREATE DATABASE mytestdb;',
                arch,
                xEnabled: process.env.X_OFF === 'true' ? 'OFF' : 'FORCE',
                initSQLFilePath
            }
    
            const db = await createDB(options)
            let mySQLVersion;

            try {
                const connection = await sql.createConnection({
                    host: '127.0.0.1',
                    user: db.username,
                    port: db.port
                })
        
                mySQLVersion = (await connection.query('SELECT VERSION()'))[0][0]["VERSION()"]

                //If this does not fail, it means initSQLString works as expected and the database was successfully created.
                await connection.query('USE mytestdb;')

                //If this does not fail, it means initSQLFilePath works as expected and the database was successfully created.
                await connection.query('USE initfromsqlfilepath;')
        
                await connection.end();
            } catch (e) {
                console.error('TEST ERROR:', e)
            } finally {
                await db.stop();
            }
    
            expect(satisfies(coerce(mySQLVersion) || 'error', version)).toBe(true)
        })
    }
}

//The test suites will fail if there aren't any tests. Since we're skipping creating tests if the test platform doesn't support the MySQL
//binary, we need this test here just in case all the MySQL binaries are skipped
test('dummy test', () => {
    expect(1 + 1).toBe(2)
})