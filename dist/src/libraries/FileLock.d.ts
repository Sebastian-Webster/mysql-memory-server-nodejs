import { InternalServerOptions } from "../../types";
export declare function waitForLock(path: string, options: InternalServerOptions): Promise<void>;
export declare function lockFile(path: string): Promise<() => Promise<void>>;
