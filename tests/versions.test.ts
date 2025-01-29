import {expect, test, jest} from '@jest/globals'
import { createDB } from '../src/index'
import sql from 'mysql2/promise'
import { coerce, satisfies } from 'semver';
import { randomUUID } from 'crypto';
import { ServerOptions } from '../types';
import { normalize } from 'path';
import getBinaryURL from '../src/libraries/Version';
import { DOWNLOADABLE_MYSQL_VERSIONS } from '../src/constants';
import fsPromises from 'fs/promises'

const usernames = ['root', 'dbuser']

const GitHubActionsTempFolder = process.platform === 'win32' ? 'C:\\Users\\RUNNER~1\\mysqlmsn' : '/tmp/mysqlmsn'
const dbPath = normalize(GitHubActionsTempFolder + '/dbs')
const binaryPath = normalize(GitHubActionsTempFolder + '/binaries')

jest.setTimeout(500_000);

const arch = process.arch === 'x64' || (process.platform === 'win32' && process.arch === 'arm64') ? 'x64' : 'arm64';

for (const version of ['5.7.44', '8.0.11', '9.x']) {
    try {
        getBinaryURL(version, arch)
    } catch (e) {
        console.warn(`Skipping version ${version} because the version is not supported on this system. The reason given from getBinaryURL was: ${e}`)
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
                arch,
                downloadBinaryOnce: false
            }

            const CIDBPath = `${dbPath}/${randomUUID()}`
    
            if (process.env.useCIDBPath) {
                process.env.mysqlmsn_internal_DO_NOT_USE_dbPath = CIDBPath
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

            //If everything was successful, delete the database if running in CI (if not running in CI, deleteDBAfterStopped is set to true and so the db is deleted automatically)
            try {
                if (process.env.useCIDBPath) {
                    console.log('Deleting database with version:', version, 'and username:', username, 'because the test run was successful.')
                    await fsPromises.rm(CIDBPath, {recursive: true, force: true, retryDelay: 100, maxRetries: 50})
                    console.log('Successfully deleted database with version:', version, 'and username:', username)
                }
            } catch (e) {
                console.error('An error occurred while deleting successful database with version:', version, 'and username:', username, '. The error was:', e)
            }
    
            expect(satisfies(coerce(mySQLVersion) || 'error', version)).toBe(true)
        })
    }
}