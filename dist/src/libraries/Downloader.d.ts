import Logger from './Logger';
import { BinaryInfo, InternalServerOptions } from '../../types';
export declare function downloadBinary(binaryInfo: BinaryInfo, options: InternalServerOptions, logger: Logger): Promise<string>;
