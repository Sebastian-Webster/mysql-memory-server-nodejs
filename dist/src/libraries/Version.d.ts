import { InternalServerOptions, MySQLVersion } from "../../types";
export default function getBinaryURL(versions: MySQLVersion[], versionToGet: string, options: InternalServerOptions): {
    url: string;
    version: string;
};
