# MySQL Memory Server

This package allows you to create ephemeral MySQL databases inside of Node.js, great for testing. When creating a new database, if the version selected is not installed on the system, the binary is downloaded from MySQL's CDN (cdn.mysql.com)

You can run multiple MySQL databases with this package at the same time. Each database will use a random free port. The databases will automatically shutdown when the Node.js process exits. A `stop()` method is also provided to stop each database instance.

## Installation

Download with your package manager of choice. The package name is `mysql-memory-server`. If using npm, the install command will be `npm install mysql-memory-server`.

#### Requirements

- Node.js 16+
- macOS 13+, Windows, or Linux (Only Ubuntu has been tested. Other Linux distributions may or may not work at this time. Ubuntu 24.04 and newer is not fully supported at this time - go to the bottom of this file to learn more)

Windows only requirements:
- `Microsoft Visual C++ 2019 Redistributable Package` needs to be installed

Linux only requirements:
- The `libaio1` package needs to be installed
- The `tar` package needs to be installed

## Usage

```javascript
import { createDB } from 'mysql-memory-server';
import sql from 'mysql2/promise'

// Create a new database
const db = await createDB()

// Connect to the new database with the port provided
const connection = await sql.createConnection({
        host: '127.0.0.1',
        user: 'root',
        port: db.port,
        database: db.dbName
})

// Run your queries here
// ...

// Once done, disconnect from the database
await connection.end()

// Then stop the database
await db.stop()
```

## Documentation

##### `createDB(options: ServerOptions): Promise<MySQLDB>`
###### On success, resolves with an object with the following properties:

- `port: number`
The port that the MySQL database is listening on
- `xPort: number`
The port that MySQLX is listening on
- `dbName: string`
The database that was created on database initialization
- `stop: () => Promise<void>`
The method to stop the database. The returned promise resolves when the database has successfully stopped.

###### Options:
- `version: string`

Required: No

Default: undefined

Description: Version of MySQL to use for the database. Uses semver for getting the version, so valid semver versions are allowed. For example, `8.x` is a valid version and will use the latest 8.x MySQL version. 

If left undefined and the system has MySQL already installed, the system installed version of MySQL will be used. If left undefined and the system does not have MySQL installed, the latest version of MySQL in the `versions.json` file in this package will be downloaded. If defined and the system has that version of MySQL installed, the system installed version will be used. If defined and the system does not have that version of MySQL installed, that version will be downloaded as long as it is found in the `versions.json` file in this package.

- `dbName: string`

Required: No

Default: "dbdata"

Description: The name of the database to create when initializing MySQL. You'd use this name to connect to the database.

- `logLevel: "LOG" | "WARN" | "ERROR"`

Required: No

Default: "ERROR"

Description: Log level for the database. If "ERROR" is used, only errors will show up in the console. If "WARN" is used, warnings and errors will show up in the console. If "LOG" is used, everything will show up in the console.

- `portRetries: number`

Required: No

Default: 10

Description: Number of times to try connecting MySQL to a randomly generated port before giving up. According to the [MySQL Documentation](https://dev.mysql.com/doc/refman/en/server-options.html#option_mysqld_port "MySQL Documentation") if port 0 is used as the MySQL server port, the default value (3306) will be used. To get around this, a random number between 1025 - 65535 (inclusive) is generated and used for the database's port. If MySQL cannot successfully listen on a randomly generated port after `portRetries` then the `createDB()` promise is rejected. A warning is created when MySQL tries connecting to a port that is already in use.

- `downloadBinaryOnce: boolean`

Required: No

Default: true

Description: If set to true, all versions requested that need to be downloaded from MySQL's CDN will be downloaded once and will stay on the system after the database stops. If set to false, the binaries that need to be downloaded will be downloaded for each database creation and will be deleted when the database is stopped.

Use `false` to save disk space after the databases have been stopped, or use `true` to save bandwidth

- `lockRetries: number`

Required: No

Default: 1,000

Description: If `downloadBinaryOnce` is set to `true`, `lockRetries` is the number of times to check to see if the lock for the binary has been released (meaning it has been successfully downloaded and extracted). If the number of retries exceeds `lockRetries`, the `createDB()` promise gets rejected.

- `lockRetryWait: number`

Required: No

Default: 1,000

Description: If `downloadBinaryOnce` is set to `true`, `lockRetryWait` is the number of milliseconds to wait before checking if the lock has been released.

## If using Ubuntu 24.04 and newer

Selecting what MySQL version to use is not currently supported on Ubuntu 24.04 and newer. To use this package on Ubuntu 24.04 and newer you must have the `mysql-server` package installed on your system and `ServerOptions.version` must either be the version that is installed on the system or undefined.
