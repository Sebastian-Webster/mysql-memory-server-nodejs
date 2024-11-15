# MySQL Memory Server

This package allows you to create ephemeral MySQL databases from JavaScript and/or TypeScript code, great for testing. When creating a new database, if the version selected is not installed on the system, the binary is downloaded from MySQL's CDN (cdn.mysql.com)

You can run multiple MySQL databases with this package at the same time. Each database will use a random free port. The databases will automatically shutdown when the JS runtime process exits. A `stop()` method is also provided to stop each database instance.

## Installation

Download with your package manager of choice. The package name is `mysql-memory-server`. If using npm, the install command will be `npm install mysql-memory-server`.

#### Requirements

- Node.js >=16.6.0 or Bun >= 1.0.0
- macOS 13+, Windows, or Linux (This package is only tested on Ubuntu 20.04, 22.04, 24.04, and Fedora 40. Other Linux distributions may or may not work at this time.)

#### Requirements for downloaded MySQL versions

The following requirements only apply if you intend to have `mysql-memory-server` download a version of MySQL to use instead of using an already installed version of MySQL on the system:

Requirements for Windows:
- `Microsoft Visual C++ 2019 Redistributable Package` needs to be installed

Requirements for Linux:
- The `libaio1` or `libaio1t64` package needs to be installed
- If `libaio1` is not available but `libaio1t64` is, the `ldconfig` command needs to be available to run
- The `tar` package needs to be installed

#### Currently supported MySQL versions

- If using the system installed MySQL server: 8.0.20 and newer
- If not using the system installed MySQL server: 8.0.39, 8.0.40, 8.1.0, 8.2.0, 8.3.0, 8.4.2, 8.4.3, 9.0.1, 9.1.0

## Usage

This package supports both ESM and CJS so you can use import or require.

```javascript
import { createDB } from 'mysql-memory-server';
import sql from 'mysql2/promise'

// Create a new database with default options
const db = await createDB()

//OR

//Create a new database with custom options set
const db = await createDB({
        // see Options for the options you can use in this object and their default values
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

## Documentation

##### `createDB(options: ServerOptions): Promise<MySQLDB>`
###### On success, resolves with an object with the following properties:

- `port: number`
The port that the MySQL database is listening on
- `xPort: number`
The port that MySQLX is listening on
- `dbName: string`
The database that was created on database initialization
- `username: string`
The name of the user to use to login to the database
- `stop: () => Promise<void>`
The method to stop the database. The returned promise resolves when the database has successfully stopped.

###### Options:
- `version: string`

Required: No

Default: undefined

Description: Version of MySQL to use for the database. Uses semver for getting the version, so valid semver versions are allowed. For example, `8.x` is a valid version and will use the latest 8.x MySQL version. 

If left undefined:
- If the system has MySQL installed, the system-installed version will be used. If the installed version is not supported by this package (currently <8.0.20), an error will be thrown unless `ignoreUnsupportedSystemVersion` is set to `true`.
- If the system does not have MySQL installed, the latest version of MySQL in the `versions.json` file in this package will be downloaded.

If defined:
- If the version is 8.0.19 or older, an error will be thrown as this package does not currently support those versions of MySQL.
- If the desired version of MySQL is installed on the system, the installed version will be used. Otherwise the selected version will be downloaded from the MySQL CDN as long as it can be found in the `versions.json` file. If it cannot be found in that file, an error will be thrown.

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

- `username: string`

Required: No

Default: root

Description: The username of the user that is used to login to the database.

- `port: number`

Required: No

Default: 0

Description: The port that the database will listen on. If set to 0, a randomly generated port is used.

- `xPort: number`

Required: No

Default: 0

Description: The port that the MySQL X Plugin will listen on. If set to 0, a randomly generated port is used.

- `ignoreUnsupportedSystemVersion: boolean`

Required: No

Default: false

Description: This option only applies if the system-installed MySQL version is lower than the oldest supported MySQL version for this package (8.0.20) and the `version` option is not defined. If set to `true`, this package will use the latest version of MySQL instead of the system-installed version. If `false`, the package will throw an error.

- `downloadRetries: number`

Required: No

Default: 3

Description: The number of times to try to download a MySQL binary before giving up and rejecting the `createDB()` promise.

- `initSQLString: string`

Required: No

Default: ""

Description: A string with MySQL queries to run before the database starts to accept connections. This option can be used for things like initialising tables without having to first connect to the database to do that.The queries in the string get executed after ```mysql-memory-server```'s queries run. Uses the ```--init-file``` MySQL server option under the hood. Learn more at the [--init-file MySQL Documentation](https://dev.mysql.com/doc/refman/8.4/en/server-system-variables.html#sysvar_init_file)

The internal queries that are ran before the queries in ```initSQLString``` are renaming the user from ```root``` to the username specified in the ```username``` option if it's set, and creating a database with the name from the ```dbName``` option.

***
### :warning: Internal Options :warning:

The following options are only meant for internal debugging use. Their behaviour may change or they may get removed between major/minor/patch versions and they are not to be considered stable. The options below will not follow Semantic Versioning so it is advised to not use them.

- `_DO_NOT_USE_deleteDBAfterStopped: boolean`

Required: No

Default: true

Description: Changes whether or not the database will be deleted after it has been stopped. If set to `true`, the database WILL be deleted after it has been stopped.

- `_DO_NOT_USE_dbPath: string`

Required: No

Default: `TMPDIR/mysqlmsn/dbs/UUID` (replacing TMPDIR with the OS temp directory and UUID with a UUIDv4 without seperating dashes).

Description: The folder to store database-related data in

- `_DO_NOT_USE_binaryDirectoryPath: string`

Required: No

Default: `TMPDIR/mysqlmsn/binaries` (replacing TMPDIR with the OS temp directory)

Description: The folder to store the MySQL binaries when they are downloaded from the CDN.
