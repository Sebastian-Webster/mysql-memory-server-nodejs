import { ExecException } from "child_process"

export type LOG_LEVEL = 'LOG' | 'WARN' | 'ERROR'

export type ServerOptions = {
    version?: string,
    dbName: string,
    loglevel?: LOG_LEVEL
}

export type InternalServerOptions = {
    version?: string,
    dbName: string,
    logLevel: LOG_LEVEL
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
    stop: () => Promise<void>
}

export type MySQLVersion = {
    version: string,
    arch: string,
    os: string,
    osKernelVersionsSupported: string,
    url: string
}