import {expect, test, jest} from '@jest/globals'
import { createDB } from '../src/index'
import sql from 'mysql2/promise'
import { coerce, satisfies } from 'semver';
import { ServerOptions } from '../types';
import getBinaryURL from '../src/libraries/Version';
import { DOWNLOADABLE_MYSQL_VERSIONS } from '../src/constants';
import etcOSRelease from '../src/libraries/LinuxOSRelease';

const usernames = ['root', 'dbuser']

jest.setTimeout(500_000); //5 minutes

const arch = process.arch === 'x64' || (process.platform === 'win32' && process.arch === 'arm64') ? 'x64' : 'arm64';

console.log('Platform:')
console.log('Platform:', process.platform)
console.log('etcOSRelease:', etcOSRelease)

for (const version of DOWNLOADABLE_MYSQL_VERSIONS.filter(v => satisfies(v, process.env.VERSION_REQUIREMENT || '>0.0.0'))) {
    try {
        getBinaryURL(version, arch)
    } catch (e) {
        console.warn(`Skipping version ${version} because the version is not supported on this system. The reason given from getBinaryURL was: ${e}`)
        continue
    }

    for (const username of usernames) {
        test(`running on version ${version} with username ${username}`, async () => {
            const options: ServerOptions = {
                version,
                dbName: 'testingdata',
                username: username,
                logLevel: 'LOG',
                initSQLString: 'CREATE DATABASE mytestdb;',
                arch
            }
    
            const db = await createDB(options)
            const connection = await sql.createConnection({
                host: '127.0.0.1',
                user: db.username,
                port: db.port
            })
    
            const mySQLVersion = (await connection.query('SELECT VERSION()'))[0][0]["VERSION()"]

            //If this does not fail, it means initSQLString works as expected and the database was successfully created.
            await connection.query('USE mytestdb;')
    
            await connection.end();
            await db.stop();
    
            expect(satisfies(coerce(mySQLVersion) || 'error', version)).toBe(true)
        })
    }
}

//The test suites will fail if there aren't any tests. Since we're skipping creating tests if the test platform doesn't support the MySQL
//binary, we need this test here just in case all the MySQL binaries are skipped
test('dummy test', () => {
    expect(1 + 1).toBe(2)
})