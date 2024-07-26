import {expect, test, jest, beforeEach, afterEach} from '@jest/globals'
import { createDB } from '../src/index'
import sql from 'mysql2/promise'
import { MySQLDB } from '../types';

jest.setTimeout(20_000);

let db: MySQLDB;
let connection: sql.Connection;

beforeEach(async () => {
    db = await createDB()
    connection = await sql.createConnection({
        host: '127.0.0.1',
        user: 'root',
        port: db.port
    })
})

afterEach(async () => {
    await connection.end();
    await db.stop();
})

test('Latest version', async () => {
    const result = await connection.query('SELECT 1 + 1')

    expect(result[0][0]['1 + 1']).toBe(2)
})