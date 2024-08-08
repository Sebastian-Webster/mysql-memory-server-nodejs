import {expect, test, jest} from '@jest/globals'
import { createDB } from '../src/index'
import sql from 'mysql2/promise'
import { coerce } from 'semver';
import { randomUUID } from 'crypto';

const versions = ['9.0.1', '8.4.2', '8.0.39', '8.1.0', '8.2.0', '8.3.0']

const dbPathPrefix = process.platform === 'win32' ? '%TEMP%\\dbs' : '/tmp/dbs'

jest.setTimeout(900_000);

for (const version of versions) {
    test(`running on version ${version}`, async () => {
        const db = await createDB({version, dbName: 'testingdata', username: 'root', logLevel: 'LOG', deleteDBAfterStopped: !process.env.CI, dbPath: process.env.CI ? `${dbPathPrefix}/${randomUUID()}` : undefined})
        const connection = await sql.createConnection({
            host: '127.0.0.1',
            user: db.username,
            port: db.port
        })

        const mySQLVersion = (await connection.query('SELECT VERSION()'))[0][0]["VERSION()"]

        await connection.end();
        await db.stop();

        expect(coerce(mySQLVersion)?.version).toBe(version)
    })
}