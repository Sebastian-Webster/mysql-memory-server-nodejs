import Logger from './Logger';
import { BinaryInfo, ServerOptions } from '../../types';
export declare function downloadVersions(): Promise<string>;
export declare function downloadBinary(binaryInfo: BinaryInfo, options: ServerOptions, logger: Logger): Promise<string>;
