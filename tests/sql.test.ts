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
    Error.stackTraceLimit = Infinity
    const options: ServerOptions = {
        username: 'root',
        logLevel: 'LOG',
        deleteDBAfterStopped: !process.env.useCIDBPath,
        ignoreUnsupportedSystemVersion: true
    }

    if (process.env.useCIDBPath) {
        options.dbPath = `${dbPath}/${randomUUID()}`
        options.binaryDirectoryPath = binaryPath
    }
    
    db = await createDB(options)
})

afterEach(async () => {
    Error.stackTraceLimit = Infinity
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