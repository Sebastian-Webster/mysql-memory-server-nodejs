import {expect, test, jest} from '@jest/globals'
import { createDB } from '../src/index'
import sql from 'mysql2/promise'
import { ServerOptions } from '../types';

jest.setTimeout(500_000); //5 minutes

const arch = process.arch === 'x64' || (process.platform === 'win32' && process.arch === 'arm64') ? 'x64' : 'arm64';

test(`MySQL X is off when disabling it`, async () => {
    const options: ServerOptions = {
        arch,
        xEnabled: 'OFF',
        logLevel: 'LOG'
    }

    const db = await createDB(options)
    const connection = await sql.createConnection({
        host: '127.0.0.1',
        user: db.username,
        port: db.port
    })

    const plugins = JSON.stringify((await connection.query('SHOW PLUGINS;'))[0])
    console.log(plugins)
    const mysqlXDisabled = plugins.includes('"Name":"mysqlx","Status":"DISABLED"')

    await connection.end();
    await db.stop();

    expect(mysqlXDisabled).toBe(true)
    expect(db.xPort).toBe(-1)
    expect(db.xSocket).toBe('')
})

test(`MySQL X is on when enabling it`, async () => {
    const options: ServerOptions = {
        arch,
        xEnabled: 'ON',
        logLevel: 'LOG'
    }

    const db = await createDB(options)
    const connection = await sql.createConnection({
        host: '127.0.0.1',
        user: db.username,
        port: db.port
    })

    const plugins = JSON.stringify((await connection.query('SHOW PLUGINS;'))[0])
    console.log(plugins)
    const mysqlXEnabled = plugins.includes('"Name":"mysqlx","Status":"ACTIVE"')

    await connection.end();
    await db.stop();

    expect(mysqlXEnabled).toBe(true)
    expect(db.xPort).toBeGreaterThan(0)
    expect(db.xPort).toBeLessThanOrEqual(65535)
    expect(typeof db.xSocket).toBe('string')
})

test(`MySQL X is on when force enabling it`, async () => {
    const options: ServerOptions = {
        arch,
        xEnabled: 'FORCE',
        logLevel: 'LOG'
    }

    const db = await createDB(options)
    const connection = await sql.createConnection({
        host: '127.0.0.1',
        user: db.username,
        port: db.port
    })

    const plugins = JSON.stringify((await connection.query('SHOW PLUGINS;'))[0])
    console.log(plugins)
    const mysqlXEnabled = plugins.includes('"Name":"mysqlx","Status":"ACTIVE"')

    await connection.end();
    await db.stop();

    expect(mysqlXEnabled).toBe(true)
    expect(db.xPort).toBeGreaterThan(0)
    expect(db.xPort).toBeLessThanOrEqual(65535)
    expect(typeof db.xSocket).toBe('string')
})