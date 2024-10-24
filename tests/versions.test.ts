import {expect, test, jest} from '@jest/globals'
import { createDB } from '../src/index'
import sql from 'mysql2/promise'
import { coerce } from 'semver';
import { randomUUID } from 'crypto';
import { ServerOptions } from '../types';
import { normalize } from 'path';

const versions = ['9.0.1', '8.4.2', '8.0.39', '8.1.0', '8.2.0', '8.3.0']
const usernames = ['root', 'dbuser', 'admin']

const GitHubActionsTempFolder = process.platform === 'win32' ? 'C:\\Users\\RUNNER~1\\mysqlmsn' : '/tmp/mysqlmsn'
const dbPath = normalize(GitHubActionsTempFolder + '/dbs')
const binaryPath = normalize(GitHubActionsTempFolder + '/binaries')

jest.setTimeout(500_000);

for (const version of versions) {
    for (const username of usernames) {
        test(`running on version ${version} with username ${username}`, async () => {
            Error.stackTraceLimit = Infinity
            const options: ServerOptions = {
                version,
                dbName: 'testingdata',
                username: username,
                logLevel: 'LOG',
                deleteDBAfterStopped: !process.env.useCIDBPath,
                ignoreUnsupportedSystemVersion: true,
                initSQLString: 'CREATE DATABASE mytestdb;'
            }
    
            if (process.env.useCIDBPath) {
                options.dbPath = `${dbPath}/${randomUUID()}`
                options.binaryDirectoryPath = binaryPath
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
    
            expect(coerce(mySQLVersion)?.version).toBe(version)
        })
    }
}