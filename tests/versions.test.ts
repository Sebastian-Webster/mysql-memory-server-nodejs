import {expect, test, jest} from '@jest/globals'
import { createDB } from '../src/index'
import sql from 'mysql2/promise'
import { coerce, satisfies } from 'semver';
import { randomUUID } from 'crypto';
import { ServerOptions } from '../types';
import { normalize } from 'path';

const versions = ['5.7.20', '8.0.40', '8.4.3', '9.0.1']
const usernames = ['root', 'dbuser']

const GitHubActionsTempFolder = process.platform === 'win32' ? 'C:\\Users\\RUNNER~1\\mysqlmsn' : '/tmp/mysqlmsn'
const dbPath = normalize(GitHubActionsTempFolder + '/dbs')
const binaryPath = normalize(GitHubActionsTempFolder + '/binaries')

jest.setTimeout(500_000);

for (const version of versions) {
    for (const username of usernames) {
        test(`running on version ${version} with username ${username}`, async () => {
            process.env.mysqlmsn_internal_DO_NOT_USE_deleteDBAfterStopped = String(!process.env.useCIDBPath)

            const options: ServerOptions = {
                version,
                dbName: 'testingdata',
                username: username,
                logLevel: 'LOG',
                initSQLString: 'CREATE DATABASE mytestdb;'
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