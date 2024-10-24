import { ExecFileException } from "child_process"

export type LOG_LEVEL = 'LOG' | 'WARN' | 'ERROR'

export type ServerOptions = {
    version?: string | undefined,
    dbName?: string | undefined,
    logLevel?: LOG_LEVEL | undefined,
    portRetries?: number | undefined,
    downloadBinaryOnce?: boolean | undefined,
    lockRetries?: number | undefined,
    lockRetryWait?: number | undefined,
    username?: string | undefined,
    deleteDBAfterStopped?: boolean | undefined,
    dbPath?: string | undefined,
    ignoreUnsupportedSystemVersion?: boolean | undefined,
    port?: number | undefined,
    xPort?: number | undefined,
    binaryDirectoryPath?: string | undefined,
    downloadRetries?: number | undefined,
    initSQLString?: string | undefined
}

export type InternalServerOptions = {
    version?: string | undefined,
    dbName: string,
    logLevel: LOG_LEVEL,
    portRetries: number,
    downloadBinaryOnce: boolean,
    lockRetries: number,
    lockRetryWait: number,
    username: string,
    deleteDBAfterStopped: boolean,
    dbPath: string,
    ignoreUnsupportedSystemVersion: boolean,
    port: number,
    xPort: number,
    binaryDirectoryPath: string,
    downloadRetries: number,
    initSQLString: string
}

export type ExecutorOptions = {
    logLevel: LOG_LEVEL
}

export type ExecuteFileReturn = {
    error: ExecFileException | null,
    stdout: string,
    stderr: string
}

export type MySQLDB = {
    port: number,
    xPort: number,
    dbName: string,
    username: string,
    stop: () => Promise<void>
}

export type MySQLVersion = {
    version: string,
    arch: string,
    os: string,
    osKernelVersionsSupported: string,
    url: string
}

export type InstalledMySQLVersion = {
    version: string,
    path: string
}

export type BinaryInfo = {
    url: string,
    version: string
}