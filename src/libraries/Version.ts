import { InternalServerOptions, MySQLVersion } from "../../types";
import * as os from 'os'
import { satisfies, coerce } from "semver";

export default function getBinaryURL(versions: MySQLVersion[], versionToGet: string = "9.x", options: InternalServerOptions) {
    let availableVersions = versions;

    availableVersions = availableVersions.filter(v => v.arch === options.arch)

    if (availableVersions.length === 0) throw `No MySQL binary could be found for your CPU architecture: ${options.arch}`

    availableVersions = availableVersions.filter(v => v.os === process.platform)

    if (availableVersions.length === 0) throw `No MySQL binary could be found for your OS: ${process.platform}`

    availableVersions = availableVersions.filter(v => {
        const release = coerce(os.release())
        if (!release) return false
        return satisfies(release.version, v.osKernelVersionsSupported)
    })

    if (availableVersions.length === 0) throw `No MySQL binary could be found that supports your OS version: ${os.release()} | ${os.version()}`

    const wantedVersions = availableVersions.filter(v => satisfies(v.version, versionToGet))

    if (wantedVersions.length === 0) throw `No MySQL binary could be found that meets your version requirement: ${versionToGet} for OS ${process.platform} version ${os.release()} on arch ${process.arch}. The available versions for download are: ${availableVersions.map(v => v.version)}`

    //Sorts versions in descending order
    wantedVersions.sort((a, b) => a.version < b.version ? 1 : a.version === b.version ? 0 : -1)

    const v = wantedVersions[0]

    return {
        url: v.url,
        version: v.version
    }
}