import {expect, test, jest} from '@jest/globals'
import { createDB } from '../src/index'
import sql from 'mysql2/promise'
import { ServerOptions } from '../types';
import { randomUUID } from 'crypto';

jest.setTimeout(215_000);

const dbPathPrefix = process.platform === 'win32' ? 'C:\\Users\\RUNNER~1\\dbs' : '/tmp/dbs'

for (let i = 0; i < 100; i++) {
    test.concurrent(`if run ${i} is successful`, async () => {
        Error.stackTraceLimit = Infinity
        console.log('CI:', process.env.useCIDBPath)
    
        const options: ServerOptions = {
            username: 'dbuser',
            logLevel: 'LOG',
            deleteDBAfterStopped: !process.env.useCIDBPath
        }
    
        if (process.env.useCIDBPath) {
            options.dbPath = `${dbPathPrefix}/${randomUUID()}-db${i}`
        }
        
        const db = await createDB(options)
        const connection = await sql.createConnection({
            host: '127.0.0.1',
            user: db.username,
            port: db.port
        })
    
        const result = await connection.query('SELECT 1 + 1')
    
        await connection.end();
    
        await db.stop();
    
        expect(result[0][0]['1 + 1']).toBe(2)
    })
}