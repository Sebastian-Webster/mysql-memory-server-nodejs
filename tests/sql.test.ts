import {expect, test, jest, beforeEach, afterEach} from '@jest/globals'
import { createDB } from '../src/index'
import sql from 'mysql2/promise'
import { MySQLDB } from '../types';

jest.setTimeout(1_000_000_000);

test('Runs with installed version (or downloads version if one is not available)', async () => {
    const db = await createDB({loglevel: 'LOG', dbName: 'test'})
    const connection = await sql.createConnection({
        host: '127.0.0.1',
        user: 'root',
        port: db.port
    })

    const result = await connection.query('SELECT 1 + 1')

    expect(result[0][0]['1 + 1']).toBe(2)

    await connection.end();
    await db.stop();
})