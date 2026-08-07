import { createDB } from '../src/index'
import sql from 'mysql2/promise'

async function main() {
    console.log('Starting test...')
    const db = await createDB()

     const connection = await sql.createConnection({
        host: '127.0.0.1',
        user: db.username,
        port: db.port
    })
    
    const received = await connection.query('SELECT 1 + 1')
    const result = Object.values(received[0][0])[0]
    if (result !== 2) {
        throw `Result is not what was expected. Expected 2, received ${result}`
    }

    await connection.end()
    await db.stop()
    console.log('Test was successful.')

}

main()