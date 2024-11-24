import Logger from "./Logger";
import { InstalledMySQLVersion, InternalServerOptions, MySQLDB } from "../../types";
declare class Executor {
    #private;
    logger: Logger;
    DBDestroySignal: AbortController;
    removeExitHandler: () => void;
    constructor(logger: Logger);
    getMySQLVersion(preferredVersion?: string): Promise<InstalledMySQLVersion | null>;
    startMySQL(options: InternalServerOptions, binaryFilepath: string): Promise<MySQLDB>;
}
export default Executor;
