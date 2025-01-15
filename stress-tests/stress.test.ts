import {expect, test, jest} from '@jest/globals'
import { createDB } from '../src/index'
import sql from 'mysql2/promise'
import { ServerOptions } from '../types';
import { normalize } from 'path';

jest.setTimeout(500_000);

const GitHubActionsTempFolder = process.platform === 'win32' ? 'C:\\Users\\RUNNER~1\\mysqlmsn' : '/tmp/mysqlmsn'
const dbPath = normalize(GitHubActionsTempFolder + '/dbs')
const binaryPath = normalize(GitHubActionsTempFolder + '/binaries')

for (let i = 0; i < 100; i++) {
    test(`if run ${i} is successful`, async () => {
        console.log('CI:', process.env.useCIDBPath)

        process.env.mysqlmsn_internal_DO_NOT_USE_deleteDBAfterStopped = String(!process.env.useCIDBPath)
    
        const options: ServerOptions = {
            username: 'dbuser',
            logLevel: 'LOG',
            ignoreUnsupportedSystemVersion: true
        }
    
        if (process.env.useCIDBPath) {
            process.env.mysqlmsn_internal_DO_NOT_USE_dbPath = `${dbPath}/${i}`
            process.env.mysqlmsn_internal_DO_NOT_USE_binaryDirectoryPath = binaryPath
        }
        
        const db = await createDB(options)
        try {
            const connection = await sql.createConnection({
                host: '127.0.0.1',
                user: db.username,
                port: db.port
            })
        
            const result = await connection.query('SELECT 1 + 1')
        
            await connection.end();

            expect(result[0][0]['1 + 1']).toBe(2)
        } finally {
            await db.stop();
        }
    })
}