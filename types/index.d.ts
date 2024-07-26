import { ExecException } from "child_process"

declare global {
    type LOG_LEVEL = 'LOG' | 'WARN' | 'ERROR'

    type ServerOptions = {
        version?: string,
        dbName: string,
        loglevel?: LOG_LEVEL
    }

    type InternalServerOptions = {
        version?: string,
        dbName: string,
        logLevel: LOG_LEVEL
    }

    type ExecutorOptions = {
        logLevel: LOG_LEVEL
    }
    
    type ExecuteReturn = {
        error: ExecException | null,
        stdout: string,
        stderr: string
    }
    
    type MySQLDB = {
        port: number,
        xPort: number,
        dbName: string,
        stop: () => Promise<void>
    }
}