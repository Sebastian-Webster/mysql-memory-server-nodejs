#!/usr/bin/env node
import { createDB } from "./index";
import { OPTION_TYPE_CHECKS } from "./constants";

async function main() {
    const definedOptions = process.argv.filter((option) => option.startsWith('--'))
    const options = {
        _DO_NOT_USE_beforeSignalCleanupMessage: '\nShutting down the epehemeral MySQL database and cleaning all related files...',
        _DO_NOT_USE_afterSignalCleanupMessage: 'Shutdown and cleanup is complete.'
    }
    for (const opt of definedOptions) {
        const index = process.argv.indexOf(opt)
        const optionValue = process.argv[index + 1]

        if (optionValue === undefined) {
            throw `Option ${opt} must have a value.`
        }

        const optionName = opt.slice(2)
        const optionType = OPTION_TYPE_CHECKS[optionName].definedType;

        //Try to convert the options to their correct types.
        //We do not need to do any proper type validation here as the library will make sure everything is correct.
        //Like for example, if a string is passed to a number option, it'll be converted to NaN here, but the library
        //will throw an error for it not being an actual number.
        if (optionType === 'boolean') {
            if (optionValue === 'true') {
                options[optionName] = true
            } else if (optionValue === 'false') {
                options[optionName] = false
            } else {
                options[optionName] = optionValue
            }
        } else if (optionType === 'number') {
            options[optionName] = parseInt(optionValue)
        } else {
            options[opt.slice(2)] = optionValue
        }
    }
    console.log('Creating ephemeral MySQL database...')
    const db = await createDB(options);
    console.log(`A MySQL databases has been successfully created with the following parameters:\n\nUsername: ${db.username} \nDatabase Name: ${db.dbName} \nPort: ${db.port} \nX Plugin Port: ${db.xPort} \nSocket: ${db.socket} \nX Plugin Socket: ${db.xSocket}\n`)
    console.log(`If you want to use the MySQL CLI client to connect to the database, you can use either commands: \nmysql -u ${db.username} -P ${db.port} --protocol tcp \nOR\nmysql -u ${db.username} --socket ${db.socket}`)
}

main()
