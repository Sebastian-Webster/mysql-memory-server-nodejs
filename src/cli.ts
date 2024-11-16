#!/usr/bin/env node
import { createDB } from "./index";

async function main() {
    console.log('Creating ephemeral MySQL database...')
    const db = await createDB();
    console.log(`A MySQL databases has been successfully created with the following parameters.\nUsername: ${db.username} \nDatabase Name: ${db.dbName} \nPort: ${db.port} \nX Plugin Port: ${db.xPort} \nSocket: ${db.socket} \nX Plugin Socket: ${db.xSocket}`)
    console.log(`If you want to use the MySQL CLI client to connect to the database, you can use either commands: \nmysql -u ${db.username} -P ${db.port} --protocol tcp \nOR\nmysql -u ${db.username} --socket ${db.socket}`)
}

main()
