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
    arch?: "arm64" | "x64" | undefined
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
    arch: string
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
    mysql: {
        version: string,
        versionIsInstalledOnSystem: boolean
    },
    stop: () => Promise<void>
}

export type MySQLVersion = {
    version: string,
    arch: string,
    os: string,
    osKernelVersionsSupported: string,
    url: string
}

export type DownloadedMySQLVersion = {
    version: string,
    path: string,
    installedOnSystem: boolean
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