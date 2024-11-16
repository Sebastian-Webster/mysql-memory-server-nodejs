#!/usr/bin/env node
import { createDB } from "./index";

async function main() {
    console.log('Creating ephemeral MySQL database...')
    const db = await createDB();
    console.log(`A MySQL databases has been successfully created with the following parameters.\nUsername: ${db.username} \nDatabase Name: ${db.dbName} \nPort: ${db.port} \nX Plugin Port: ${db.xPort}`)
}

main()
