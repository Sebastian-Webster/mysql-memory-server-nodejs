import {expect, test, jest} from '@jest/globals'
import { createDB } from '../src/index'
import sql from 'mysql2/promise'
import { coerce, satisfies } from 'semver';
import { randomUUID } from 'crypto';
import { ServerOptions } from '../types';
import { normalize } from 'path';
import { MYSQL_ARCH_SUPPORT } from '../src/constants';

const versions = ['5.7.x', '8.0.x', '8.4.x', '9.x']
const usernames = ['root', 'dbuser']

const GitHubActionsTempFolder = process.platform === 'win32' ? 'C:\\Users\\RUNNER~1\\mysqlmsn' : '/tmp/mysqlmsn'
const dbPath = normalize(GitHubActionsTempFolder + '/dbs')
const binaryPath = normalize(GitHubActionsTempFolder + '/binaries')

jest.setTimeout(500_000);

const arch = process.arch === 'x64' || (process.platform === 'win32' && process.arch === 'arm64') ? 'x64' : 'arm64';
const archSupport = MYSQL_ARCH_SUPPORT[process.platform]?.[arch]

for (const version of versions) {
    if (!archSupport || !satisfies(version, archSupport)) {
        console.warn(`Skipping test for version ${version} because this version either does not support this type of operating system and/or CPU architecture.`)
        continue
    }

    for (const username of usernames) {
        test(`running on version ${version} with username ${username}`, async () => {
            process.env.mysqlmsn_internal_DO_NOT_USE_deleteDBAfterStopped = String(!process.env.useCIDBPath)

            const options: ServerOptions = {
                version,
                dbName: 'testingdata',
                username: username,
                logLevel: 'LOG',
                initSQLString: 'CREATE DATABASE mytestdb;',
                arch
            }
    
            if (process.env.useCIDBPath) {
                process.env.mysqlmsn_internal_DO_NOT_USE_dbPath = `${dbPath}/${randomUUID()}`
                process.env.mysqlmsn_internal_DO_NOT_USE_binaryDirectoryPath = binaryPath
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