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
    ignoreUnsupportedSystemVersion?: boolean | undefined,
    port?: number | undefined,
    xPort?: number | undefined,
    downloadRetries?: number | undefined,
    initSQLString?: string | undefined,
    arch?: "arm64" | "x64" | undefined,
    _DO_NOT_USE_deleteDBAfterStopped?: boolean | undefined,
    _DO_NOT_USE_dbPath?: string | undefined,
    _DO_NOT_USE_binaryDirectoryPath?: string | undefined,
    _DO_NOT_USE_cli?: boolean | undefined
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
    ignoreUnsupportedSystemVersion: boolean,
    port: number,
    xPort: number,
    downloadRetries: number,
    initSQLString: string,
    arch: string,
    _DO_NOT_USE_deleteDBAfterStopped: boolean,
    _DO_NOT_USE_dbPath: string,
    _DO_NOT_USE_binaryDirectoryPath: string,
    _DO_NOT_USE_cli: boolean
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
    socket: string,
    xSocket: string,
    dbName: string,
    username: string,
    version: string,
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

export type OptionTypeChecks = {
    [key in keyof Required<ServerOptions>]: {
        check: (opt: any) => boolean,
        errorMessage: string,
        definedType: "string" | "boolean" | "number"
    }
}