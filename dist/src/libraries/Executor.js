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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _Executor_instances, _Executor_execute, _Executor_killProcess, _Executor_startMySQLProcess, _Executor_setupDataDirectories;
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const semver_1 = require("semver");
const os = __importStar(require("os"));
const fsPromises = __importStar(require("fs/promises"));
const fs = __importStar(require("fs"));
const Port_1 = require("./Port");
const AbortSignal_1 = __importDefault(require("./AbortSignal"));
const path_1 = require("path");
class Executor {
    constructor(logger) {
        _Executor_instances.add(this);
        this.logger = logger;
    }
    async deleteDatabaseDirectory(path) {
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
                        const { error, stdout, stderr } = await __classPrivateFieldGet(this, _Executor_instances, "m", _Executor_execute).call(this, `"${path}" --version`);
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
                const { error, stdout, stderr } = await __classPrivateFieldGet(this, _Executor_instances, "m", _Executor_execute).call(this, 'mysqld --version');
                if (stderr && stderr.includes('not found')) {
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
        let retries = 0;
        const datadir = (0, path_1.normalize)(`${options.dbPath}/data`);
        do {
            await __classPrivateFieldGet(this, _Executor_instances, "m", _Executor_setupDataDirectories).call(this, options, binaryFilepath, datadir);
            const port = (0, Port_1.GenerateRandomPort)();
            const mySQLXPort = (0, Port_1.GenerateRandomPort)();
            this.logger.log('Using port:', port, 'and MySQLX port:', mySQLXPort, 'on retry:', retries);
            try {
                this.logger.log('Starting MySQL process');
                const resolved = await __classPrivateFieldGet(this, _Executor_instances, "m", _Executor_startMySQLProcess).call(this, options, port, mySQLXPort, datadir, options.dbPath, binaryFilepath);
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
_Executor_instances = new WeakSet(), _Executor_execute = function _Executor_execute(command) {
    return new Promise(resolve => {
        (0, child_process_1.exec)(command, { signal: AbortSignal_1.default.signal }, (error, stdout, stderr) => {
            resolve({ error, stdout, stderr });
        });
    });
}, _Executor_killProcess = async function _Executor_killProcess(process) {
    let killed = false;
    if (os.platform() === 'win32') {
        const { error, stderr } = await __classPrivateFieldGet(this, _Executor_instances, "m", _Executor_execute).call(this, `taskkill /pid ${process.pid} /t /f`);
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
}, _Executor_startMySQLProcess = function _Executor_startMySQLProcess(options, port, mySQLXPort, datadir, dbPath, binaryFilepath) {
    const errors = [];
    const logFile = `${dbPath}/log.log`;
    const errorLogFile = `${datadir}/errorlog.err`;
    return new Promise(async (resolve, reject) => {
        await fsPromises.rm(logFile, { force: true });
        const process = (0, child_process_1.spawn)(binaryFilepath, ['--no-defaults', `--port=${port}`, `--datadir=${datadir}`, `--mysqlx-port=${mySQLXPort}`, `--mysqlx-socket=${dbPath}/x.sock`, `--socket=${dbPath}/m.sock`, `--general-log-file=${logFile}`, '--general-log=1', `--init-file=${dbPath}/init.sql`, '--bind-address=127.0.0.1', '--innodb-doublewrite=OFF', '--mysqlx=FORCE', `--log-error=${errorLogFile}`], { signal: AbortSignal_1.default.signal, killSignal: 'SIGKILL' });
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
                    await this.deleteDatabaseDirectory(options.dbPath);
                }
                catch (e) {
                    this.logger.error(e);
                    return reject(`MySQL failed to listen on a certain port. To restart MySQL with a different port, the database directory needed to be deleted. An error occurred while deleting the database directory. Aborting. The error was: ${e}`);
                }
                return reject('Port is already in use');
            }
            try {
                if (options.deleteDBAfterStopped) {
                    await this.deleteDatabaseDirectory(dbPath);
                }
            }
            finally {
                try {
                    if (binaryFilepath.includes(os.tmpdir()) && !options.downloadBinaryOnce) {
                        const splitPath = binaryFilepath.split(os.platform() === 'win32' ? '\\' : '/');
                        const binariesIndex = splitPath.indexOf('binaries');
                        //The path will be the directory path for the binary download
                        splitPath.splice(binariesIndex + 2);
                        //Delete the binary folder
                        await fsPromises.rm(splitPath.join('/'), { force: true, recursive: true });
                    }
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
                        dbName: options.dbName,
                        username: options.username,
                        stop: () => {
                            return new Promise(async (resolve, reject) => {
                                resolveFunction = resolve;
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
}, _Executor_setupDataDirectories = async function _Executor_setupDataDirectories(options, binaryFilepath, datadir) {
    this.logger.log('Created data directory for database at:', datadir);
    await fsPromises.mkdir(datadir, { recursive: true });
    const { error: err, stderr } = await __classPrivateFieldGet(this, _Executor_instances, "m", _Executor_execute).call(this, `"${binaryFilepath}" --no-defaults --datadir=${datadir} --initialize-insecure`);
    if (err || (stderr && !stderr.includes('InnoDB initialization has ended'))) {
        if (process.platform === 'win32' && ((err === null || err === void 0 ? void 0 : err.message.includes('Command failed')) || stderr.includes('Command failed'))) {
            this.logger.error(err || stderr);
            throw 'The mysqld command failed to run. A possible cause is that the Microsoft Visual C++ Redistributable Package is not installed. MySQL 5.7.40 and newer requires Microsoft Visual C++ Redistributable Package 2019 to be installed. Check the MySQL docs for Microsoft Visual C++ requirements for other MySQL versions. If you are sure you have this installed, check the error message in the console for more details.';
        }
        if (process.platform === 'linux' && ((err === null || err === void 0 ? void 0 : err.message.includes('libaio.so')) || stderr.includes('libaio.so'))) {
            this.logger.error(err || stderr);
            throw 'The mysqld command failed to run. MySQL needs the libaio package installed on Linux systems to run. Do you have this installed? Learn more at https://dev.mysql.com/doc/refman/en/binary-installation.html';
        }
        throw err || stderr;
    }
    let initText = `CREATE DATABASE ${options.dbName};`;
    if (options.username !== 'root') {
        initText += `\nRENAME USER 'root'@'localhost' TO '${options.username}'@'localhost';`;
    }
    await fsPromises.writeFile(`${options.dbPath}/init.sql`, initText, { encoding: 'utf8' });
};
exports.default = Executor;
