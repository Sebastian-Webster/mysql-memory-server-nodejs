import { MySQLVersion } from "../../types";
export default function getBinaryURL(versions: MySQLVersion[], versionToGet?: string): {
    url: string;
    version: string;
};
