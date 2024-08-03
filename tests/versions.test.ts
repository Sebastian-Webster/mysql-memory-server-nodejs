import {expect, test, jest} from '@jest/globals'
import { createDB } from '../src/index'
import sql from 'mysql2/promise'
import { coerce } from 'semver';

const versions = ['9.0.1', '8.4.2', '8.0.39', '8.1.0', '8.2.0', '8.3.0']

jest.setTimeout(900_000);

for (const version of versions) {
    test(`running on version ${version}`, async () => {
        const db = await createDB({version, dbName: 'testingdata'})
        const connection = await sql.createConnection({
            host: '127.0.0.1',
            user: 'root',
            port: db.port
        })

        const mySQLVersion = (await connection.query('SELECT VERSION()'))[0][0]["VERSION()"]

        await connection.end();
        await db.stop();

        expect(coerce(mySQLVersion)?.version).toBe(version)
    })
}