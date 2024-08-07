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
var _Executor_instances, _Executor_execute, _Executor_startMySQLProcess;
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const semver_1 = require("semver");
const os = __importStar(require("os"));
const fsPromises = __importStar(require("fs/promises"));
const fs = __importStar(require("fs"));
const Port_1 = require("./Port");
const AbortSignal_1 = __importDefault(require("./AbortSignal"));
const path_1 = require("path");
const crypto_1 = require("crypto");
class Executor {
    constructor(logger) {
        _Executor_instances.add(this);
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
    startMySQL(options, binaryFilepath) {
        return new Promise(async (resolve, reject) => {
            //mysqlmsn = MySQL Memory Server Node.js
            const dbPath = (0, path_1.normalize)(`${os.tmpdir()}/mysqlmsn/dbs/${(0, crypto_1.randomUUID)().replace(/-/g, '')}`);
            const datadir = (0, path_1.normalize)(`${dbPath}/data`);
            this.logger.log('Created data directory for database at:', datadir);
            await fsPromises.mkdir(datadir, { recursive: true });
            const { error: err, stderr } = await __classPrivateFieldGet(this, _Executor_instances, "m", _Executor_execute).call(this, `"${binaryFilepath}" --no-defaults --datadir=${datadir} --initialize-insecure`);
            if (err || (stderr && !stderr.includes('InnoDB initialization has ended'))) {
                if (process.platform === 'win32' && err.message.includes('Command failed')) {
                    this.logger.error(err || stderr);
                    return reject('The mysqld command failed to run. A possible cause is that the Microsoft Visual C++ Redistributable Package is not installed. MySQL 5.7.40 and newer requires Microsoft Visual C++ Redistributable Package 2019 to be installed. Check the MySQL docs for Microsoft Visual C++ requirements for other MySQL versions. If you are sure you have this installed, check the error message in the console for more details.');
                }
                if (process.platform === 'linux' && err.message.includes('libaio.so')) {
                    this.logger.error(err || stderr);
                    return reject('The mysqld command failed to run. MySQL needs the libaio package installed on Linux systems to run. Do you have this installed? Learn more at https://dev.mysql.com/doc/refman/en/binary-installation.html');
                }
                return reject(err || stderr);
            }
            let initText = `CREATE DATABASE ${options.dbName};`;
            if (options.username !== 'root') {
                initText += `RENAME USER 'root'@'localhost' TO '${options.username}'@'localhost';`;
            }
            await fsPromises.writeFile(`${dbPath}/init.sql`, initText, { encoding: 'utf8' });
            let retries = 0;
            do {
                const port = (0, Port_1.GenerateRandomPort)();
                const mySQLXPort = (0, Port_1.GenerateRandomPort)();
                this.logger.log('Using port:', port, 'on retry:', retries);
                try {
                    const resolved = await __classPrivateFieldGet(this, _Executor_instances, "m", _Executor_startMySQLProcess).call(this, options, port, mySQLXPort, datadir, dbPath, binaryFilepath);
                    return resolve(resolved);
                }
                catch (e) {
                    if (e !== 'Port is already in use') {
                        return reject(e);
                    }
                    retries++;
                    if (retries < options.portRetries) {
                        this.logger.warn(`One or both of these ports are already in use: ${port} or ${mySQLXPort}. Now retrying... ${retries}/${options.portRetries} possible retries.`);
                    }
                }
            } while (retries < options.portRetries);
            reject(`The port has been retried ${options.portRetries} times and a free port could not be found.\nEither try again, or if this is a common issue, increase options.portRetries.`);
        });
    }
}
_Executor_instances = new WeakSet(), _Executor_execute = function _Executor_execute(command) {
    return new Promise(resolve => {
        (0, child_process_1.exec)(command, { signal: AbortSignal_1.default.signal }, (error, stdout, stderr) => {
            resolve({ error, stdout, stderr });
        });
    });
}, _Executor_startMySQLProcess = function _Executor_startMySQLProcess(options, port, mySQLXPort, datadir, dbPath, binaryFilepath) {
    const errors = [];
    const logFile = `${dbPath}/log.log`;
    return new Promise(async (resolve, reject) => {
        await fsPromises.rm(logFile, { force: true });
        const process = (0, child_process_1.spawn)(binaryFilepath, ['--no-defaults', `--port=${port}`, `--datadir=${datadir}`, `--mysqlx-port=${mySQLXPort}`, `--mysqlx-socket=${dbPath}/x.sock`, `--socket=${dbPath}/m.sock`, `--general-log-file=${logFile}`, '--general-log=1', `--init-file=${dbPath}/init.sql`, '--bind-address=127.0.0.1', '--innodb-doublewrite=OFF'], { signal: AbortSignal_1.default.signal, killSignal: 'SIGKILL' });
        //resolveFunction is the function that will be called to resolve the promise that stops the database.
        //If resolveFunction is not undefined, the database has received a kill signal and data cleanup procedures should run.
        //Once ran, resolveFunction will be called.
        let resolveFunction;
        process.on('close', async (code, signal) => {
            const errorString = errors.join('\n');
            if (errorString.includes('Address already in use')) {
                return reject('Port is already in use');
            }
            try {
                await fsPromises.rm(dbPath, { recursive: true, force: true });
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
                if (code === 0) {
                    return reject('Database exited early');
                }
                if (code) {
                    this.logger.error(errorString);
                    return reject(errorString);
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
        fs.watchFile(logFile, async (curr) => {
            if (curr.dev !== 0) {
                //File exists
                const file = await fsPromises.readFile(logFile, { encoding: 'utf8' });
                if (file.includes('started with:')) {
                    fs.unwatchFile(logFile);
                    resolve({
                        port,
                        xPort: mySQLXPort,
                        dbName: options.dbName,
                        username: options.username,
                        stop: () => {
                            return new Promise(async (resolve, reject) => {
                                resolveFunction = resolve;
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
};
exports.default = Executor;
