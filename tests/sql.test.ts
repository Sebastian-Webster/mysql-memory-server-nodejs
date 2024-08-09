import {expect, test, jest, beforeEach, afterEach} from '@jest/globals'
import { createDB } from '../src/index'
import sql from 'mysql2/promise'
import { MySQLDB, ServerOptions } from '../types';
import { randomUUID } from 'crypto';

jest.setTimeout(900_000);

let db: MySQLDB;

const dbPathPrefix = process.platform === 'win32' ? 'C:\\Users\\RUNNER~1\\dbs' : '/tmp/dbs'

beforeEach(async () => {
    Error.stackTraceLimit = Infinity
    const options: ServerOptions = {
        username: 'root',
        logLevel: 'LOG',
        deleteDBAfterStopped: !process.env.useCIDBPath
    }

    if (process.env.useCIDBPath) {
        options.dbPath = `${dbPathPrefix}/${randomUUID()}`
    }
    
    db = await createDB(options)
})

afterEach(async () => {
    Error.stackTraceLimit = Infinity
    await db.stop();
})

test('Runs with installed version (or downloads version if one is not available)', async () => {
    Error.stackTraceLimit = Infinity
    console.log('CI:', process.env.useCIDBPath)
    const connection = await sql.createConnection({
        host: '127.0.0.1',
        user: db.username,
        port: db.port
    })

    const result = await connection.query('SELECT 1 + 1')

    expect(result[0][0]['1 + 1']).toBe(2)

    await connection.end();
})