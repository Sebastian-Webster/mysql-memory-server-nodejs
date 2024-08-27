import { ExecException } from "child_process"

export type LOG_LEVEL = 'LOG' | 'WARN' | 'ERROR'

export type ServerOptions = {
    version?: string,
    dbName?: string,
    logLevel?: LOG_LEVEL,
    portRetries?: number,
    downloadBinaryOnce?: boolean,
    lockRetries?: number,
    lockRetryWait?: number,
    username?: string,
    deleteDBAfterStopped?: boolean,
    dbPath?: string,
    ignoreUnsupportedSystemVersion?: boolean,
    port?: number,
    xPort?: number,
    validateChecksums?: boolean
}

export type InternalServerOptions = {
    version?: string,
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
    validateChecksums: boolean
}

export type ExecutorOptions = {
    logLevel: LOG_LEVEL
}

export type ExecuteReturn = {
    error: ExecException | null,
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
    url: string,
    checksum: string
}

export type InstalledMySQLVersion = {
    version: string,
    path: string
}

export type BinaryInfo = {
    url: string,
    version: string,
    checksum: string
}