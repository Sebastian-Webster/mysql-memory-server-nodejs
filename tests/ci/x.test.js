// This test is written in JavaScript and using 'dist' as it's source because if it wasn't, Babel would be required.
// At the time of writing, Babel only supports Node ^20 or >=22 (and errors on anything that isn't that) and we support Node >=16.6.0.
// If/when we drop support for these legacy Node versions, this file can be changed back to TS and use 'src' for the source files.

const { expect, test } = require('@jest/globals')
const { createDB } = require('../../dist/src/index.js')
const sql = require('mysql2/promise')
const http = require('http')

jest.setTimeout(500_000); //5 minutes

const arch = process.arch === 'x64' || (process.platform === 'win32' && process.arch === 'arm64') ? 'x64' : 'arm64';

test(`MySQL X is off when disabling it`, async () => {
    const options = {
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

test(`MySQL X is on when force enabling it`, async () => {
    const options = {
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

test('DB creation throws when MySQL fails to initialise and X is force enabled', async () => {
    const server = await new Promise(resolve => {
        const httpServer = new http.Server();
        httpServer.listen(0, () => {
            resolve(httpServer)
        })
    })

    const serverAddress = server.address();
    if (typeof serverAddress === 'string') {
        throw 'serverAddress is a string. Should be an object'
    }
    if (serverAddress === null) {
        throw 'serverAddress is null. Should be an object.'
    }

    const options = {
        arch,
        logLevel: 'LOG',
        xPort: serverAddress.port, // Use a port that is already in use to get X to fail
        xEnabled: 'FORCE',
        initSQLString: 'SELECT 2+2;',
        portRetries: 3
    }

    let thrown = false;

    try {
        await createDB(options)
    } catch (e) {
        thrown = e
    }

    await new Promise(resolve => {
        server.on('close', resolve)
        server.close()
    })

    expect(thrown).toBe('The port has been retried 3 times and a free port could not be found.\nEither try again, or if this is a common issue, increase options.portRetries.')
})