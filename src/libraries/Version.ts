import { BinaryInfo, InternalServerOptions } from "../../types";
import * as os from 'os'
import { satisfies, coerce, lt, major, minor } from "semver";
import { DMR_MYSQL_VERSIONS, DOWNLOADABLE_MYSQL_VERSIONS, MYSQL_ARCH_SUPPORT, MYSQL_MIN_OS_SUPPORT, RC_MYSQL_VERSIONS } from "../constants";

export default function getBinaryURL(versionToGet: string = "x", options: InternalServerOptions): BinaryInfo {
    const selectedVersions = DOWNLOADABLE_MYSQL_VERSIONS.filter(version => satisfies(version, versionToGet));

    if (selectedVersions.length === 0) {
        throw `mysql-memory-server does not support downloading the version of MySQL requested (${versionToGet}). Please check for typos, choose a different version of MySQL to use, or make an issue or pull request to add support for this MySQL version on GitHub.`
    }

    //Sorts versions in descending order
    selectedVersions.sort((a, b) => a < b ? 1 : -1)

    const selectedVersion = selectedVersions[0]

    // Start of checking if the OS version is compatible with the selected MySQL version
    const currentOS = os.platform();
    const OSVersionSupport = MYSQL_MIN_OS_SUPPORT[currentOS];

    if (!OSVersionSupport) throw `MySQL and/or mysql-memory-server does not support your operating system. Please make sure you are running the latest version of mysql-memory-server or try running on a different operating system or report an issue on GitHub if you believe this is a bug.`

    const OSSupportVersionRanges = Object.keys(OSVersionSupport);

    const OSKey = OSSupportVersionRanges.find(item => satisfies(selectedVersion, item))

    if (!OSKey) throw `This version of MySQL (${selectedVersion}) does not support your operating system. Please make sure you are running the latest version of mysql-memory-server or choose a different version of MySQL or report an issue on GitHub if you believe this is a bug.`

    const minOSForMySQLVersion = OSVersionSupport[OSKey]

    if (lt(coerce(os.release()), minOSForMySQLVersion)) throw `Your operating system is too out of date to use version ${selectedVersion} of MySQL. MySQL requires >= ${minOSForMySQLVersion} but your system is ${os.release()}. Please update your operating system, choose a different version of MySQL to use, or report an issue on GitHub if you believe this is a bug.`
    // End of checking if the OS version is compatible with the selected MySQL version

    // Start of checking if the CPU architecture is compatible with the selected MySQL version
    const currentArch = options.arch;
    const archSupport = MYSQL_ARCH_SUPPORT[currentOS][currentArch]

    if (!archSupport) {
        if (currentOS === 'win32' && currentArch === 'arm64') throw 'mysql-memory-server has detected you are running Windows on ARM. MySQL does not support Windows on ARM. To get this package working, please try setting the "arch" option to "x64".'
        throw `MySQL and/or mysql-memory-server does not support the CPU architecture you want to use (${currentArch}). Please make sure you are using the latest version of mysql-memory-server or try using a different architecture, or if you believe this is a bug, please report this on GitHub.`
    }

    if (!satisfies(selectedVersion, archSupport)) {
        throw `The desired version of MySQL to run (${selectedVersion}) does not support the CPU architecture (${currentArch}). Please try using a different architecture or MySQL version, or if you believe this is a bug, please report this on GitHub.`
    }
    // End of checking if the CPU architecture is compatible with the selected MySQL version

    let url: string = 'https://www.google.com/404';

    const isRC = satisfies(selectedVersion, RC_MYSQL_VERSIONS)
    const isDMR = satisfies(selectedVersion, DMR_MYSQL_VERSIONS)

    if (currentOS === 'win32') {
        url = `https://cdn.mysql.com/archives/mysql-${major(selectedVersion)}.${minor(selectedVersion)}/mysql-${selectedVersion}${isRC ? '-rc' : isDMR ? '-dmr' : ''}-winx64.zip`
        
    }

    //TODO: Support for other platforms will be coming soon.

    return {
        version: selectedVersion,
        url
    }
}