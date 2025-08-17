# MySQL Memory Server

This package allows you to create ephemeral MySQL databases from JavaScript and/or TypeScript code and also the CLI, great for testing, CI, and learning MySQL. When creating a new database, if the version selected is not installed on the system, the binary is downloaded from MySQL's CDN (cdn.mysql.com). This package supports Linux, macOS, and Windows.

You can run multiple MySQL databases with this package at the same time. Each database will use a random free port. The databases will automatically shutdown when the JS runtime process exits. A `stop()` method is also provided to stop each database instance.

## Installation

Download with your package manager of choice. The package name is `mysql-memory-server`. If using npm, the install command will be `npm install mysql-memory-server`.

#### Requirements

- Node.js >=16.6.0 or Bun >= 1.0.0

#### Currently supported MySQL versions

- ```mysql-memory-server``` can run MySQL versions 5.7.19 and newer (if the version is already installed on your system)
- ```mysql-memory-server``` can download and run MySQL versions (inclusive) 5.7.19 - 5.7.44, 8.0.0 - 8.0.43, 8.1.0 - 8.4.6, and 9.0.1 - 9.4.0 (if the version is not already installed on your system)

Extra system requirements apply when ```mysql-memory-server``` is downloading MySQL instead of running a version of MySQL that is already installed on the system. To see the requirements and learn more about the supported versions for download, [read the doc](https://github.com/Sebastian-Webster/mysql-memory-server-nodejs/blob/v1.12.0/docs/SUPPORTED_MYSQL_DOWNLOADS.md)

## Example Usage - Application Code

This package supports both ESM and CJS so you can use import or require.

```javascript
import { createDB } from 'mysql-memory-server';
import sql from 'mysql2/promise'

// Create a new database with default options
const db = await createDB()

//OR

//Create a new database with custom options set
const db = await createDB({
        // see Options below for the options you can use in this object and their default values
        // for example:
        version: '8.4.x'
})

// Connect to the new database with the port provided
// The database is initialized with an empty password so use an empty string for the password
const connection = await sql.createConnection({
        host: '127.0.0.1',
        user: db.username,
        port: db.port,
        database: db.dbName,
        password: ''
})

// Run your queries here
// ...

// Once done, disconnect from the database
await connection.end()

// Then stop the database
await db.stop()
```

MySQL database initialization can take some time. If you run into a "Timeout exceeded" error with your tests, the timeout should be extended.
If using Jest, information about how to do this can be found here: https://jestjs.io/docs/jest-object#jestsettimeouttimeout

## Example Usage - CLI

```sh
# Options are added by doing --{optionName} {optionValue}
# See Options below for the options you can use with this package
npx mysql-memory-server@latest --version 8.4.x
```

## Documentation

##### `createDB(options: ServerOptions): Promise<MySQLDB>`
###### On success, resolves with an object with the following properties:

- `port: number`
The port that the MySQL database is listening on
- `xPort: number`
The port that MySQLX is listening on. If ```options.xEnabled``` is set to "OFF", this value will be -1.
- `dbName: string`
The database that was created on database initialization
- `username: string`
The name of the user to use to login to the database
- `socket: string`
If on Windows, this is the name of the named pipe that MySQL is listening on. If not on Windows, this is the path to the socket that MySQL is listening on.
- `xSocket: string`
If on Windows, this is the name of the named pipe that the MySQL X Plugin is listening on. If not on Windows, this is the path that the MySQL X Plugin is listening on. If ```options.xEnabled``` is set to "OFF", this value will be an empty string.
- `mysql: {version: string, versionIsInstalledOnSystem: boolean}`
An object with three properties. ```version``` is the version of MySQL used to create the database. ```versionIsInstalledOnSystem``` will be true if the MySQL version used is already installed on the system and false if the version had to be downloaded from MySQL's CDN.
- `stop: () => Promise<void>`
The method to stop the database. The returned promise resolves when the database has successfully stopped.

#### Options:
##### All options are not required to be set. Using ```undefined``` as a value will use the option's default value.
- `version: string`

Default: undefined

Description: Version of MySQL to use for the database. Uses semver for getting the version, so valid semver versions are allowed. For example, `8.x` is a valid version and will use the latest 8.x MySQL version. 

If left undefined:
- If the system has MySQL installed, the system-installed version will be used. If the installed version is not supported by this package (currently <5.7.19), an error will be thrown unless `ignoreUnsupportedSystemVersion` is set to `true`.
- If the system does not have MySQL installed, the latest version of MySQL that [this package supports downloading](https://github.com/Sebastian-Webster/mysql-memory-server-nodejs/blob/v1.12.0/docs/SUPPORTED_MYSQL_DOWNLOADS.md) will be downloaded.

If defined:
- If the version is older than 5.7.19, an error will be thrown as this package does not currently support those versions of MySQL.
- If the desired version of MySQL is already installed on the system, the installed version will be used. Otherwise the selected version will be downloaded as long as this package [supports downloading it](https://github.com/Sebastian-Webster/mysql-memory-server-nodejs/blob/v1.12.0/docs/SUPPORTED_MYSQL_DOWNLOADS.md). If this package does not support downloading the selected version, or your system does not [meet the requirements](https://github.com/Sebastian-Webster/mysql-memory-server-nodejs/blob/v1.12.0/docs/SUPPORTED_MYSQL_DOWNLOADS.md) for that version to be ran, an error will be thrown.

- `dbName: string`

Default: "dbdata"

Description: The name of the database to create when initializing MySQL. You'd use this name to connect to the database.

- `logLevel: "LOG" | "WARN" | "ERROR"`

Default: "ERROR"

Description: Log level for this package. If "ERROR" is used, only errors from this package will show up in the console. If "WARN" is used, warnings and errors from this package will show up in the console. If "LOG" is used, every log from this package will show up in the console.

- `portRetries: number`

Default: 10

Description: Number of times to try connecting MySQL to a randomly generated port before giving up. According to the [MySQL Documentation](https://dev.mysql.com/doc/refman/en/server-options.html#option_mysqld_port "MySQL Documentation") if port 0 is used as the MySQL server port, the default value (3306) will be used. To get around this, a random number between 1025 - 65535 (inclusive) is generated and used for the database's port. If MySQL cannot successfully listen on a randomly generated port after `portRetries` then the `createDB()` promise is rejected. A warning is created when MySQL tries connecting to a port that is already in use. This option only applies for the MySQL port if the MySQL port is not explicitly set or if it's set to 0. This option also only applies for the MySQL X port if the MySQL X port is not explicitly set or if it's set to 0.

- `downloadBinaryOnce: boolean`

Default: true

Description: If set to true, all versions requested that need to be downloaded from MySQL's CDN will be downloaded once and will stay on the system after the database stops. If set to false, the binaries that need to be downloaded will be downloaded for each database creation and will be deleted when the database is stopped.

Use `false` to save disk space after the databases have been stopped, or use `true` to save bandwidth

- `lockRetries: number`

Default: 1,000

Description: If `downloadBinaryOnce` is set to `true`, `lockRetries` is the number of times to check to see if the lock for the binary has been released (meaning it has been successfully downloaded and extracted). If the number of retries exceeds `lockRetries`, the `createDB()` promise gets rejected. This option is also used for the number of times to check to see if the lock for libaio has been released (only on Linux distros that use libaio1t64 instead of libaio1)

- `lockRetryWait: number`

Default: 1,000

Description: If `downloadBinaryOnce` is set to `true` and/or on Linux distros that use libaio1t64 instead of libaio1, `lockRetryWait` is the number of milliseconds to wait before checking if the lock has been released.

- `username: string`

Default: root

Description: The username of the user that is used to login to the database.

- `port: number`

Default: 0

Description: The port that the database will listen on. If set to 0, a randomly generated port is used.

- `xPort: number`

Default: 0

Description: The port that the MySQL X Plugin will listen on. If set to 0, a randomly generated port is used.

- `ignoreUnsupportedSystemVersion: boolean`

Default: false

Description: This option only applies if the system-installed MySQL version is lower than the oldest supported MySQL version for this package (5.7.19) and the `version` option is not defined. If set to `true`, this package will use the latest version of MySQL instead of the system-installed version. If `false`, the package will throw an error.

- `downloadRetries: number`

Default: 10

Description: The number of times to try to download a MySQL binary before giving up and rejecting the `createDB()` promise.

- `initSQLString: string`

Default: ""

Description: A string with MySQL queries to run before the database starts to accept connections. This option can be used for things like initialising tables without having to first connect to the database to do that. The queries in the string get executed after ```mysql-memory-server```'s queries run. Uses the ```--init-file``` MySQL server option under the hood. Learn more at the [--init-file MySQL Documentation](https://dev.mysql.com/doc/refman/8.4/en/server-system-variables.html#sysvar_init_file)

The internal queries that are ran before the queries in ```initSQLString``` are creating the MySQL user with ```options.username``` username if the option's value is not ```root```, and creating a database with the ```options.dbName``` name.

- `arch: "arm64" | "x64"`

Default: process.arch

Description: The MySQL binary architecture to execute. MySQL does not offer server builds for Windows on ARM, so to get this package working on Windows on ARM, set the arch option to "x64" and Windows will emulate MySQL.

- `xEnabled: "OFF" | "FORCE"`

Default: "FORCE"

Description: This option follows the convention set out by the [MySQL Documentation](https://dev.mysql.com/doc/refman/en/plugin-loading.html). If set to "OFF", the MySQL X Plugin will not initialise. If set to "FORCE", the MySQL Server will either start up with the MySQL X Plugin guaranteed to have successfully initialised, or if initialisation fails, the server will fail to start up.
