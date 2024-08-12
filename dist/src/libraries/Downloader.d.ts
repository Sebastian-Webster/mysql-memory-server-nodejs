import Logger from './Logger';
import { BinaryInfo, InternalServerOptions } from '../../types';
export declare function downloadVersions(): Promise<string>;
export declare function downloadBinary(binaryInfo: BinaryInfo, options: InternalServerOptions, logger: Logger): Promise<string>;
