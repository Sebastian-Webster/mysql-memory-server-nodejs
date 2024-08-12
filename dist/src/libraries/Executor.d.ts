import Logger from "./Logger";
import { InstalledMySQLVersion, InternalServerOptions, MySQLDB } from "../../types";
declare class Executor {
    #private;
    logger: Logger;
    constructor(logger: Logger);
    deleteDatabaseDirectory(path: string): Promise<void>;
    getMySQLVersion(preferredVersion?: string): Promise<InstalledMySQLVersion | null>;
    startMySQL(options: InternalServerOptions, binaryFilepath: string): Promise<MySQLDB>;
}
export default Executor;
