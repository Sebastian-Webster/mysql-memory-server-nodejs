import {expect, test, jest} from '@jest/globals'
import { createDB } from '../src/index'
import sql from 'mysql2/promise'

jest.setTimeout(500_000);

const databaseCount = 3;

test(`concurrency with ${databaseCount} simulataneous database creations`, async () => {
   const dbs = await Promise.all(
        Array.from(new Array(databaseCount)).map(() => createDB({logLevel: 'LOG'}))
    )

    for (const db of dbs) {
        const connection = await sql.createConnection({
            host: '127.0.0.1',
            user: db.username,
            port: db.port
        })
    
        const result = await connection.query('SELECT 1 + 1')

        await connection.end()
        await db.stop()
    
        expect(result[0][0]['1 + 1']).toBe(2)
    }
})