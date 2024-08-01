import {expect, test, jest, beforeEach, afterEach} from '@jest/globals'
import { createDB } from '../src/index'
import sql from 'mysql2/promise'

const versions = ['9.0.1', '8.4.2', '8.0.39']

jest.setTimeout(1_000_000_000);

for (const version of versions) {
    test(`running on version ${version}`, async () => {
        const db = await createDB({version, dbName: 'testingdata', logLevel: 'LOG'})
        const connection = await sql.createConnection({
            host: '127.0.0.1',
            user: 'root',
            port: db.port
        })

        const mySQLVersion = (await connection.query('SELECT VERSION()'))[0][0]["VERSION()"]

        await connection.end();
        await db.stop();

        expect(mySQLVersion).toBe(version)
    })
}