import {expect, test, jest, beforeEach, afterEach} from '@jest/globals'
import { createDB } from '../src/index'
import sql from 'mysql2/promise'
import { MySQLDB, ServerOptions } from '../types';
import { randomUUID } from 'crypto';
import { normalize } from 'path';

jest.setTimeout(500_000);

let db: MySQLDB;

const GitHubActionsTempFolder = process.platform === 'win32' ? 'C:\\Users\\RUNNER~1\\mysqlmsn' : '/tmp/mysqlmsn'
const dbPath = normalize(GitHubActionsTempFolder + '/dbs')
const binaryPath = normalize(GitHubActionsTempFolder + '/binaries')

beforeEach(async () => {
    process.env.mysqlmsn_internal_DO_NOT_USE_deleteDBAfterStopped = String(!process.env.useCIDBPath)

    const options: ServerOptions = {
        username: 'root',
        logLevel: 'LOG'
    }

    if (process.env.useCIDBPath) {
        process.env.mysqlmsn_internal_DO_NOT_USE_dbPath = `${dbPath}/${randomUUID()}`
        process.env.mysqlmsn_internal_DO_NOT_USE_binaryDirectoryPath = binaryPath
    }
    
    db = await createDB(options)
})

afterEach(async () => {
    await db.stop();
})

test('Runs with installed version (or downloads version if one is not available)', async () => {
    Error.stackTraceLimit = Infinity
    const connection = await sql.createConnection({
        host: '127.0.0.1',
        user: db.username,
        port: db.port
    })

    const result = await connection.query('SELECT 1 + 1')

    expect(result[0][0]['1 + 1']).toBe(2)

    await connection.end();
})