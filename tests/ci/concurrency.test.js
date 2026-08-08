// This test is written in JavaScript and using 'dist' as it's source because if it wasn't, Babel would be required.
// At the time of writing, Babel only supports Node ^20 or >=22 (and errors on anything that isn't that) and we support Node >=16.6.0.
// If/when we drop support for these legacy Node versions, this file can be changed back to TS and use 'src' for the source files.

const { expect, test, jest } = require('@jest/globals')
const { createDB } = require('../../dist/src/index.js')
const sql = require('mysql2/promise')

jest.setTimeout(500_000);

const databaseCount = 3;

const arch = process.arch === 'x64' || (process.platform === 'win32' && process.arch === 'arm64') ? 'x64' : 'arm64';

test(`concurrency with ${databaseCount} simulataneous database creations`, async () => {
   const dbs = await Promise.all(
        Array.from(new Array(databaseCount)).map(() => createDB({logLevel: 'LOG', arch}))
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