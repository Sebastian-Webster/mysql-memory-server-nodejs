import Logger from "./Logger";
import { DownloadedMySQLVersion, InternalServerOptions, MySQLDB } from "../../types";
declare class Executor {
    #private;
    logger: Logger;
    DBDestroySignal: AbortController;
    removeExitHandler: () => void;
    version: string;
    versionInstalledOnSystem: boolean;
    versionSupportsMySQLX: boolean;
    databasePath: string;
    killedFromPortIssue: boolean;
    constructor(logger: Logger);
    getMySQLVersion(preferredVersion?: string): Promise<DownloadedMySQLVersion | null>;
    startMySQL(options: InternalServerOptions, installedMySQLBinary: DownloadedMySQLVersion): Promise<MySQLDB>;
}
export default Executor;
