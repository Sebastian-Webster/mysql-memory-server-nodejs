import Logger from "./Logger";
import { DownloadedMySQLVersion, InternalServerOptions, MySQLDB } from "../../types";
declare class Executor {
    #private;
    logger: Logger;
    DBDestroySignal: AbortController;
    killedFromPortIssue: boolean;
    databasePath: string;
    versionSupportsMySQLX: boolean;
    version: string;
    versionInstalledOnSystem: boolean;
    removeExitHandler: () => void;
    constructor(logger: Logger);
    getMySQLVersion(preferredVersion?: string): Promise<DownloadedMySQLVersion | null>;
    startMySQL(options: InternalServerOptions, installedMySQLBinary: DownloadedMySQLVersion): Promise<MySQLDB>;
}
export default Executor;
