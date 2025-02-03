import {expect, test, jest, beforeEach, afterEach} from '@jest/globals'
import { createDB } from '../src/index'
import sql from 'mysql2/promise'
import { MySQLDB, ServerOptions } from '../types';

jest.setTimeout(500_000);

let db: MySQLDB;

beforeEach(async () => {
    const options: ServerOptions = {
        username: 'root',
        logLevel: 'LOG'
    }
    
    db = await createDB(options)
})

afterEach(async () => {
    await db.stop();
})

test('Runs with installed version (or downloads version if one is not available)', async () => {
    const connection = await sql.createConnection({
        host: '127.0.0.1',
        user: db.username,
        port: db.port
    })

    const result = await connection.query('SELECT 1 + 1')

    expect(result[0][0]['1 + 1']).toBe(2)

    await connection.end();
})