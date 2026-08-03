import { ExecFileException } from "child_process"

export type LOG_LEVEL = 'LOG' | 'WARN' | 'ERROR'

export type PluginActivationState = 'OFF' | 'FORCE'

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
    xEnabled?: PluginActivationState | undefined,
    initSQLFilePath?: string | undefined
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
    xEnabled: PluginActivationState,
    initSQLFilePath: string
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

export type DownloadedMySQLVersion = {
    version: string,
    path: string,
    installedOnSystem: boolean,
    xPluginSupported: boolean
}

export type BinaryInfo = {
    url: string,
    version: string,
    hostedByOracle: boolean,
    xPluginSupported: boolean
}

type OptionTypeChecksDefinedTypeHelper<T> = T extends string ? "string" : T extends boolean ? "boolean" : T extends number ? "number" : never

export type OptionTypeChecks = {
    [key in keyof Required<ServerOptions>]: {
        check: (opt: any) => boolean,
        errorMessage: string,
        definedType: OptionTypeChecksDefinedTypeHelper<ServerOptions[key]>
    }
}

export type LinuxEtcOSRelease = Record<string, string> & {
    NAME?: string,
    VERSION_ID?: string
}

export type JSRuntimeVersion = {
    runtimeName: string,
    runtimeVersion: string
}