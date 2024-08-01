import { MySQLVersion } from "../../types";
import * as os from 'os'
import { satisfies } from "semver";

export default function getBinaryURL(versions: MySQLVersion[], versionToGet: string = "9.x") {
    let availableVersions = versions;

    availableVersions = availableVersions.filter(v => v.arch === process.arch)

    if (availableVersions.length === 0) throw `No MySQL binary could be found for your CPU architecture: ${process.arch}`

    availableVersions = availableVersions.filter(v => v.os === process.platform)

    if (availableVersions.length === 0) throw `No MySQL binary could be found for your OS: ${process.platform}`

    availableVersions = availableVersions.filter(v => satisfies(os.release(), v.osKernelVersionsSupported))

    if (availableVersions.length === 0) throw `No MySQL binary could be found that supports your OS version: ${os.release()} | ${os.version()}`

    availableVersions = availableVersions.filter(v => satisfies(v.version, versionToGet))

    if (availableVersions.length === 0) throw `No MySQL binary could be found that meets your version requirement: ${versionToGet} for OS ${process.platform} version ${os.release()} on arch ${process.arch}`

    //Sorts versions in descending order
    availableVersions.sort((a, b) => a.version < b.version ? 1 : a.version === b.version ? 0 : -1)

    return availableVersions[0].url
}