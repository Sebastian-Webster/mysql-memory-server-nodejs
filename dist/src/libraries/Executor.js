"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _Executor_instances, _Executor_executeFile, _Executor_killProcess, _Executor_deleteDatabaseDirectory, _Executor_returnBinaryPathToDelete, _Executor_startMySQLProcess, _Executor_setupDataDirectories;
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const semver_1 = require("semver");
const os = __importStar(require("os"));
const fsPromises = __importStar(require("fs/promises"));
const fs = __importStar(require("fs"));
const Port_1 = require("./Port");
const path_1 = require("path");
const FileLock_1 = require("./FileLock");
const signal_exit_1 = require("signal-exit");
const crypto = __importStar(require("crypto"));
class Executor {
    constructor(logger) {
        _Executor_instances.add(this);
        this.DBDestroySignal = new AbortController();
        this.logger = logger;
    }
    getMySQLVersion(preferredVersion) {
        return new Promise(async (resolve, reject) => {
            if (process.platform === 'win32') {
                try {
                    const dirs = await fsPromises.readdir(`${process.env.PROGRAMFILES}\\MySQL`);
                    const servers = dirs.filter(dirname => dirname.includes('MySQL Server'));
                    if (servers.length === 0) {
                        return resolve(null);
                    }
                    this.logger.log(servers);
                    const versions = [];
                    for (const dir of servers) {
                        const path = `${process.env.PROGRAMFILES}\\MySQL\\${dir}\\bin\\mysqld`;
                        const { error, stdout, stderr } = await __classPrivateFieldGet(this, _Executor_instances, "m", _Executor_executeFile).call(this, path, ['--version']);
                        if (error || stderr) {
                            return reject(error || stderr);
                        }
                        const verIndex = stdout.indexOf('Ver');
                        const version = (0, semver_1.coerce)(stdout.slice(verIndex));
                        if (version === null) {
                            return reject('Could not get MySQL version');
                        }
                        else {
                            versions.push({ version: version.version, path });
                        }
                    }
                    if (preferredVersion) {
                        resolve(versions.find(version => (0, semver_1.satisfies)(version.version, preferredVersion)) || null);
                    }
                    else {
                        versions.sort();
                        resolve(versions[0]);
                    }
                }
                catch (e) {
                    this.logger.error('Error occurred while getting installed MySQL version:', e);
                    resolve(null);
                }
            }
            else {
                const { error, stdout, stderr } = await __classPrivateFieldGet(this, _Executor_instances, "m", _Executor_executeFile).call(this, 'mysqld', ['--version']);
                if (error && error.code === 'ENOENT') {
                    resolve(null);
                }
                else if (error || stderr) {
                    reject(error || stderr);
                }
                else {
                    const version = (0, semver_1.coerce)(stdout);
                    if (version === null) {
                        reject('Could not get installed MySQL version');
                    }
                    else {
                        resolve({ version: version.version, path: 'mysqld' });
                    }
                }
            }
        });
    }
    async startMySQL(options, binaryFilepath) {
        this.removeExitHandler = (0, signal_exit_1.onExit)(() => {
            if (options._DO_NOT_USE_beforeSignalCleanupMessage) {
                console.log(options._DO_NOT_USE_beforeSignalCleanupMessage);
            }
            this.DBDestroySignal.abort();
            if (options._DO_NOT_USE_deleteDBAfterStopped) {
                try {
                    fs.rmSync(options._DO_NOT_USE_dbPath, { recursive: true, maxRetries: 50, force: true });
                }
                catch (e) {
                    this.logger.error('An error occurred while deleting database directory path:', e);
                }
            }
            const binaryPathToDelete = __classPrivateFieldGet(this, _Executor_instances, "m", _Executor_returnBinaryPathToDelete).call(this, binaryFilepath, options);
            if (binaryPathToDelete) {
                try {
                    fs.rmSync(binaryPathToDelete, { force: true, recursive: true, maxRetries: 50 });
                }
                catch (e) {
                    this.logger.error('An error occurred while deleting database binary:', e);
                }
            }
            if (options._DO_NOT_USE_afterSignalCleanupMessage) {
                console.log(options._DO_NOT_USE_afterSignalCleanupMessage);
            }
        });
        let retries = 0;
        const datadir = (0, path_1.normalize)(`${options._DO_NOT_USE_dbPath}/data`);
        do {
            await __classPrivateFieldGet(this, _Executor_instances, "m", _Executor_setupDataDirectories).call(this, options, binaryFilepath, datadir, true);
            this.logger.log('Setting up directories was successful');
            const port = options.port || (0, Port_1.GenerateRandomPort)();
            const mySQLXPort = options.xPort || (0, Port_1.GenerateRandomPort)();
            this.logger.log('Using port:', port, 'and MySQLX port:', mySQLXPort, 'on retry:', retries);
            try {
                this.logger.log('Starting MySQL process');
                const resolved = await __classPrivateFieldGet(this, _Executor_instances, "m", _Executor_startMySQLProcess).call(this, options, port, mySQLXPort, datadir, options._DO_NOT_USE_dbPath, binaryFilepath);
                this.logger.log('Starting process was successful');
                return resolved;
            }
            catch (e) {
                this.logger.warn('Caught error:', e, `\nRetries: ${retries} | options.portRetries: ${options.portRetries}`);
                if (e !== 'Port is already in use') {
                    this.logger.error('Error:', e);
                    throw e;
                }
                retries++;
                if (retries <= options.portRetries) {
                    this.logger.warn(`One or both of these ports are already in use: ${port} or ${mySQLXPort}. Now retrying... ${retries}/${options.portRetries} possible retries.`);
                }
                else {
                    throw `The port has been retried ${options.portRetries} times and a free port could not be found.\nEither try again, or if this is a common issue, increase options.portRetries.`;
                }
            }
        } while (retries <= options.portRetries);
    }
}
_Executor_instances = new WeakSet(), _Executor_executeFile = function _Executor_executeFile(command, args) {
    return new Promise(resolve => {
        (0, child_process_1.execFile)(command, args, { signal: this.DBDestroySignal.signal }, (error, stdout, stderr) => {
            resolve({ error, stdout, stderr });
        });
    });
}, _Executor_killProcess = async function _Executor_killProcess(process) {
    let killed = false;
    if (os.platform() === 'win32') {
        const { error, stderr } = await __classPrivateFieldGet(this, _Executor_instances, "m", _Executor_executeFile).call(this, 'taskkill', ['/pid', String(process.pid), '/t', '/f']);
        if (!error && !stderr) {
            killed = true;
        }
        else {
            this.logger.error(error || stderr);
        }
    }
    else {
        killed = process.kill();
    }
    return killed;
}, _Executor_deleteDatabaseDirectory = async function _Executor_deleteDatabaseDirectory(path) {
    let retries = 0;
    //Maximum wait of 10 seconds | 500ms * 20 retries = 10,000ms = 10 seconds
    const waitTime = 500;
    const maxRetries = 20;
    //Since the database processes are killed instantly (SIGKILL) sometimes the database file handles may still be open
    //This would cause an EBUSY error. Retrying the deletions for 10 seconds should give the OS enough time to close
    //the file handles.
    while (retries <= maxRetries) {
        try {
            await fsPromises.rm(path, { recursive: true, force: true });
            return;
        }
        catch (e) {
            if (retries === maxRetries) {
                throw e;
            }
            await new Promise(resolve => setTimeout(resolve, waitTime));
            retries++;
            this.logger.log('DB data directory deletion failed. Now on retry', retries);
        }
    }
}, _Executor_returnBinaryPathToDelete = function _Executor_returnBinaryPathToDelete(binaryFilepath, options) {
    if (binaryFilepath.includes(os.tmpdir()) && !options.downloadBinaryOnce) {
        const splitPath = binaryFilepath.split(os.platform() === 'win32' ? '\\' : '/');
        const binariesIndex = splitPath.indexOf('binaries');
        //The path will be the directory path for the binary download
        splitPath.splice(binariesIndex + 2);
        return splitPath.join('/');
    }
    return null;
}, _Executor_startMySQLProcess = function _Executor_startMySQLProcess(options, port, mySQLXPort, datadir, dbPath, binaryFilepath) {
    const errors = [];
    const logFile = `${dbPath}/log.log`;
    const errorLogFile = `${datadir}/errorlog.err`;
    return new Promise(async (resolve, reject) => {
        await fsPromises.rm(logFile, { force: true });
        const socket = os.platform() === 'win32' ? `MySQL-${crypto.randomUUID()}` : `${dbPath}/m.sock`;
        const xSocket = os.platform() === 'win32' ? `MySQLX-${crypto.randomUUID()}` : `${dbPath}/x.sock`;
        const process = (0, child_process_1.spawn)(binaryFilepath, ['--no-defaults', `--port=${port}`, `--datadir=${datadir}`, `--mysqlx-port=${mySQLXPort}`, `--mysqlx-socket=${xSocket}`, `--socket=${socket}`, `--general-log-file=${logFile}`, '--general-log=1', `--init-file=${dbPath}/init.sql`, '--bind-address=127.0.0.1', '--innodb-doublewrite=OFF', '--mysqlx=FORCE', `--log-error=${errorLogFile}`, `--user=${os.userInfo().username}`], { signal: this.DBDestroySignal.signal, killSignal: 'SIGKILL' });
        //resolveFunction is the function that will be called to resolve the promise that stops the database.
        //If resolveFunction is not undefined, the database has received a kill signal and data cleanup procedures should run.
        //Once ran, resolveFunction will be called.
        let resolveFunction;
        process.on('close', async (code, signal) => {
            let errorLog;
            try {
                errorLog = await fsPromises.readFile(errorLogFile, { encoding: 'utf-8' });
            }
            catch (e) {
                errorLog = `ERROR WHILE READING LOG: ${e}`;
            }
            const portIssue = errorLog.includes("Do you already have another mysqld server running");
            const xPortIssue = errorLog.includes("X Plugin can't bind to it");
            this.logger.log('Exiting because of a port issue:', portIssue, '. MySQL X Plugin failed to bind:', xPortIssue);
            if (portIssue || xPortIssue) {
                this.logger.log('Error log when exiting for port in use error:', errorLog);
                try {
                    await __classPrivateFieldGet(this, _Executor_instances, "m", _Executor_deleteDatabaseDirectory).call(this, options._DO_NOT_USE_dbPath);
                }
                catch (e) {
                    this.logger.error(e);
                    return reject(`MySQL failed to listen on a certain port. To restart MySQL with a different port, the database directory needed to be deleted. An error occurred while deleting the database directory. Aborting. The error was: ${e}`);
                }
                return reject('Port is already in use');
            }
            try {
                if (options._DO_NOT_USE_deleteDBAfterStopped) {
                    await __classPrivateFieldGet(this, _Executor_instances, "m", _Executor_deleteDatabaseDirectory).call(this, dbPath);
                }
            }
            catch (e) {
                this.logger.error('An error occurred while deleting database directory at path:', dbPath, '| The error was:', e);
            }
            finally {
                try {
                    const binaryPathToDelete = __classPrivateFieldGet(this, _Executor_instances, "m", _Executor_returnBinaryPathToDelete).call(this, binaryFilepath, options);
                    if (binaryPathToDelete) {
                        await fsPromises.rm(binaryPathToDelete, { force: true, recursive: true, maxRetries: 50 });
                    }
                }
                catch (e) {
                    this.logger.error('An error occurred while deleting no longer needed MySQL binary:', e);
                }
                finally {
                    if (resolveFunction) {
                        resolveFunction();
                        return;
                    }
                    const errorString = errors.join('\n');
                    if (code === 0) {
                        return reject(`Database exited early.\nError log: ${errorLog}\nError string: "${errorString}`);
                    }
                    if (code) {
                        const errorMessage = `The database exited early with code ${code}. The error log was:\n${errorLog}\nThe error string was: "${errorString}".`;
                        this.logger.error(errorMessage);
                        return reject(errorMessage);
                    }
                }
            }
        });
        process.stderr.on('data', (data) => {
            if (!resolveFunction) {
                if (Buffer.isBuffer(data)) {
                    errors.push(data.toString());
                }
                else {
                    errors.push(data);
                }
            }
        });
        fs.watchFile(errorLogFile, async (curr) => {
            if (curr.dev !== 0) {
                //File exists
                const file = await fsPromises.readFile(errorLogFile, { encoding: 'utf8' });
                if (file.includes("X Plugin can't bind to it")) {
                    //As stated in the MySQL X Plugin documentation at https://dev.mysql.com/doc/refman/8.4/en/x-plugin-options-system-variables.html#sysvar_mysqlx_bind_address
                    //when the MySQL X Plugin fails to bind to an address, it does not prevent the MySQL server startup because MySQL X is not a mandatory plugin.
                    //It doesn't seem like there is a way to prevent server startup when that happens. The workaround to that is to shutdown the MySQL server ourselves when the X plugin
                    //cannot bind to an address. If there is a way to prevent server startup when binding fails, this workaround can be removed.
                    const killed = await __classPrivateFieldGet(this, _Executor_instances, "m", _Executor_killProcess).call(this, process);
                    if (!killed) {
                        reject('Failed to kill MySQL process to retry listening on a free port.');
                    }
                }
                else if (file.includes('ready for connections. Version:')) {
                    fs.unwatchFile(errorLogFile);
                    resolve({
                        port,
                        xPort: mySQLXPort,
                        socket,
                        xSocket,
                        dbName: options.dbName,
                        username: options.username,
                        stop: () => {
                            return new Promise(async (resolve, reject) => {
                                resolveFunction = resolve;
                                this.removeExitHandler();
                                const killed = await __classPrivateFieldGet(this, _Executor_instances, "m", _Executor_killProcess).call(this, process);
                                if (!killed) {
                                    reject();
                                }
                            });
                        }
                    });
                }
            }
        });
    });
}, _Executor_setupDataDirectories = async function _Executor_setupDataDirectories(options, binaryFilepath, datadir, retry) {
    this.logger.log('Created data directory for database at:', datadir);
    await fsPromises.mkdir(datadir, { recursive: true });
    let stderr;
    if (binaryFilepath === 'mysqld') {
        const { error, stderr: output } = await __classPrivateFieldGet(this, _Executor_instances, "m", _Executor_executeFile).call(this, 'mysqld', ['--no-defaults', `--datadir=${datadir}`, '--initialize-insecure']);
        stderr = output;
        if (error) {
            this.logger.error('An error occurred while initializing database with system-installed MySQL:', error);
            throw 'An error occurred while initializing database with system-installed MySQL. Please check the console for more information.';
        }
    }
    else {
        let result;
        try {
            result = await __classPrivateFieldGet(this, _Executor_instances, "m", _Executor_executeFile).call(this, `${binaryFilepath}`, [`--no-defaults`, `--datadir=${datadir}`, `--initialize-insecure`]);
        }
        catch (e) {
            this.logger.error('Error occurred from executeFile:', e);
            throw e;
        }
        stderr = result === null || result === void 0 ? void 0 : result.stderr;
    }
    if (stderr && !stderr.includes('InnoDB initialization has ended')) {
        if (process.platform === 'win32' && stderr.includes('Command failed')) {
            this.logger.error(stderr);
            throw 'The mysqld command failed to run. A possible cause is that the Microsoft Visual C++ Redistributable Package is not installed. MySQL 5.7.40 and newer requires Microsoft Visual C++ Redistributable Package 2019 to be installed. Check the MySQL docs for Microsoft Visual C++ requirements for other MySQL versions. If you are sure you have this installed, check the error message in the console for more details.';
        }
        if (process.platform === 'linux' && stderr.includes('libaio.so')) {
            if (binaryFilepath === 'mysqld') {
                throw 'libaio could not be found while running system-installed MySQL. libaio must be installed on this system for MySQL to run. To learn more, please check out https://dev.mysql.com/doc/refman/en/binary-installation.html';
            }
            if (retry === false) {
                this.logger.error('An error occurred while initializing database:', stderr);
                throw 'Tried to copy libaio into lib folder and MySQL is still failing to initialize. Please check the console for more information.';
            }
            if (binaryFilepath.slice(-16) === 'mysql/bin/mysqld') {
                const { error: lderror, stdout, stderr: ldstderr } = await __classPrivateFieldGet(this, _Executor_instances, "m", _Executor_executeFile).call(this, 'ldconfig', ['-p']);
                if (lderror || ldstderr) {
                    this.logger.error('The following libaio error occurred:', stderr);
                    this.logger.error('After the libaio error, an ldconfig error occurred:', lderror || ldstderr);
                    throw 'The ldconfig command failed to run. This command was ran to find libaio because libaio could not be found on the system. libaio is needed for MySQL to run. Do you have ldconfig and libaio installed? Learn more about libaio at Learn more at https://dev.mysql.com/doc/refman/en/binary-installation.html';
                }
                const libaioFound = stdout.split('\n').filter(lib => lib.includes('libaio.so.1t64'));
                if (!libaioFound.length) {
                    this.logger.error('Error from launching MySQL:', stderr);
                    throw 'An error occurred while launching MySQL. The most likely cause is that libaio1 and libaio1t64 could not be found. Either libaio1 or libaio1t64 must be installed on this system for MySQL to run. To learn more, please check out https://dev.mysql.com/doc/refman/en/binary-installation.html. Check error in console for more information.';
                }
                const libaioEntry = libaioFound[0];
                const libaioPathIndex = libaioEntry.indexOf('=>');
                const libaioSymlinkPath = libaioEntry.slice(libaioPathIndex + 3);
                const libaioPath = await fsPromises.realpath(libaioSymlinkPath);
                const copyPath = (0, path_1.resolve)(`${binaryFilepath}/../../lib/private/libaio.so.1`);
                let lockRelease;
                while (true) {
                    try {
                        lockRelease = await (0, FileLock_1.lockFile)(copyPath);
                        break;
                    }
                    catch (e) {
                        if (e === 'LOCKED') {
                            this.logger.log('Waiting for lock for libaio copy');
                            await (0, FileLock_1.waitForLock)(copyPath, options);
                            this.logger.log('Lock is gone for libaio copy');
                            //If libaio does not exist after the lock has been released (like if the copy fails)
                            //then the lock acquisition process should start again
                            const binaryExists = fs.existsSync(copyPath);
                            if (!binaryExists)
                                continue;
                            break;
                        }
                        else {
                            this.logger.error('An error occurred from locking libaio section:', e);
                            throw e;
                        }
                    }
                }
                if (lockRelease) {
                    //This code will only run if the lock has been acquired successfully.
                    //If the lock was already acquired by some other process, this process would have already waited for the lock, so no copying needs to be done since it's already happened.
                    //If the lock failed to acquire for some other reason, the error would've already been thrown.
                    this.logger.log('libaio copy path:', copyPath, '| libaio symlink path:', libaioSymlinkPath, '| libaio actual path:', libaioPath);
                    let copyError;
                    try {
                        await fsPromises.copyFile(libaioPath, copyPath);
                    }
                    catch (e) {
                        copyError = e;
                        this.logger.error('An error occurred while copying libaio1t64 to lib folder:', e);
                        try {
                            await fsPromises.rm(copyPath, { force: true });
                        }
                        catch (e) {
                            this.logger.error('An error occurred while deleting libaio file:', e);
                        }
                    }
                    finally {
                        try {
                            await lockRelease();
                        }
                        catch (e) {
                            this.logger.error('Error unlocking libaio file:', e);
                        }
                        if (copyError) {
                            throw 'An error occurred while copying libaio1t64 to the MySQL lib folder. Please check the console for more details.';
                        }
                        //Retry setting up directory now that libaio has been copied
                        this.logger.log('Retrying directory setup');
                        await __classPrivateFieldGet(this, _Executor_instances, "m", _Executor_deleteDatabaseDirectory).call(this, datadir);
                        await __classPrivateFieldGet(this, _Executor_instances, "m", _Executor_setupDataDirectories).call(this, options, binaryFilepath, datadir, false);
                        return;
                    }
                }
            }
            else {
                throw 'Cannot recognize file structure for the MySQL binary folder. This was caused by not being able to find libaio. Try installing libaio. Learn more at https://dev.mysql.com/doc/refman/en/binary-installation.html';
            }
        }
        throw stderr;
    }
    this.logger.log('Creating init text');
    let initText = `CREATE DATABASE ${options.dbName};`;
    if (options.username !== 'root') {
        initText += `\nRENAME USER 'root'@'localhost' TO '${options.username}'@'localhost';`;
    }
    if (options.initSQLString.length > 0) {
        initText += `\n${options.initSQLString}`;
    }
    this.logger.log('Writing init file');
    await fsPromises.writeFile(`${options._DO_NOT_USE_dbPath}/init.sql`, initText, { encoding: 'utf8' });
    this.logger.log('Finished writing init file');
};
exports.default = Executor;
