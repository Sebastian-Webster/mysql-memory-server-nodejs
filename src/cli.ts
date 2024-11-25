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
    if (process.platform === 'win32') {
        //The connection information logs will be different for Windows compared to other platforms.
        //Windows uses mysqlsh instead of mysql to invoke the client shell, needs a --sql flag to be put into SQL mode, and also does not have a protocol flag.
        //Also according to https://bugs.mysql.com/bug.php?id=106852, you cannot log into a MySQL database with a named pipe for the first connection so a socket connection suggestion
        //should only be displayed for non-Windows platforms.
        console.log(`If you want to use the MySQL CLI client to connect to the database, you can use the following command: \nmysqlsh --sql -u ${db.username} -P ${db.port}\nIf prompted for a password, press enter. The database does not have a password set.`)
    } else {
        console.log(`If you want to use the MySQL CLI client to connect to the database, you can use either commands: \nmysql -u ${db.username} -P ${db.port} --protocol tcp \nOR\nmysql -u ${db.username} --socket ${db.socket}\nIf prompted for a password, press enter. The database does not have a password set.`)
    }
}

main()
