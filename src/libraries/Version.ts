import { BinaryInfo } from "../../types";
import * as os from 'os'
import { satisfies, coerce, lt, major, minor } from "semver";
import { archiveBaseURL, DMR_MYSQL_VERSIONS, DOWNLOADABLE_MYSQL_VERSIONS, MYSQL_ARCH_SUPPORT, MYSQL_LINUX_GLIBC_VERSIONS, MYSQL_LINUX_MINIMAL_INSTALL_AVAILABLE, MYSQL_MACOS_VERSIONS_IN_FILENAME, MYSQL_MIN_OS_SUPPORT, RC_MYSQL_VERSIONS } from "../constants";

export default function getBinaryURL(versionToGet: string = "x", currentArch: string): BinaryInfo {
    let selectedVersions = DOWNLOADABLE_MYSQL_VERSIONS.filter(version => satisfies(version, versionToGet));

    if (selectedVersions.length === 0) {
        throw `mysql-memory-server does not support downloading a version of MySQL that fits the following version requirement: ${versionToGet}. This package only supports downloads of MySQL for MySQL >= ${DOWNLOADABLE_MYSQL_VERSIONS[0]} <= ${DOWNLOADABLE_MYSQL_VERSIONS.at(-1)}. Please check for typos, choose a different version of MySQL to use, or make an issue or pull request on GitHub if you belive this is a bug.`
    }

    const currentOS = os.platform();
    const OSVersionSupport = MYSQL_MIN_OS_SUPPORT[currentOS];

    if (!OSVersionSupport) throw `MySQL and/or mysql-memory-server does not support your operating system. Please make sure you are running the latest version of mysql-memory-server or try running on a different operating system or report an issue on GitHub if you believe this is a bug.`

    const OSSupportVersionRanges = Object.keys(OSVersionSupport);

    selectedVersions = selectedVersions.filter(possibleVersion => {
        const OSKey = OSSupportVersionRanges.find(item => satisfies(possibleVersion, item))
        return !!OSKey
    })

    if (selectedVersions.length === 0) {
        throw `No version of MySQL could be found that supports your operating system and fits the following version requirement: ${versionToGet}. Please check for typos, choose a different version of MySQL to run, or if you think this is a bug, please report this on GitHub.`
    }

    const archSupport = MYSQL_ARCH_SUPPORT[currentOS][currentArch]

    if (!archSupport) {
        if (currentOS === 'win32' && currentArch === 'arm64') throw 'mysql-memory-server has detected you are running Windows on ARM. MySQL does not support Windows on ARM. To get this package working, please try setting the "arch" option to "x64".'
        throw `MySQL and/or mysql-memory-server does not support the CPU architecture you want to use (${currentArch}). Please make sure you are using the latest version of mysql-memory-server or try using a different architecture, or if you believe this is a bug, please report this on GitHub.`
    }

    selectedVersions = selectedVersions.filter(possibleVersion => satisfies(possibleVersion, archSupport))

    if (selectedVersions.length === 0) {
        throw `No version of MySQL could be found that supports the CPU architecture ${currentArch === os.arch() ? 'for your system' : 'you have chosen'} (${currentArch}). Please try choosing a different version of MySQL, or if you believe this is a bug, please report this on GitHub.`
    }

    const versionsBeforeOSVersionCheck = selectedVersions.slice()
    const coercedOSRelease = coerce(os.release())
    selectedVersions = selectedVersions.filter(possibleVersion => {
        const OSVersionKey = OSSupportVersionRanges.find(item => satisfies(possibleVersion, item))
        return !lt(coercedOSRelease, OSVersionSupport[OSVersionKey])
    })

    if (selectedVersions.length === 0) {
        const versionKeys = new Set()
        for (const v of versionsBeforeOSVersionCheck) {
            versionKeys.add(OSSupportVersionRanges.find(item => satisfies(v, item)))
        }
        const minVersions = Array.from(versionKeys).map(v => OSVersionSupport[v])
        //Sorts versions in ascending order
        minVersions.sort((a, b) => a < b ? -1 : 1)
        const minVersion = minVersions[0]
        throw `Your operating system is too out of date to run a version of MySQL that fits the following requirement: ${versionToGet}. The oldest version for your operating system that you would need to get a version that satisfies the version requirement is ${minVersion} but your current operating system is ${coercedOSRelease.version}. Please try changing your MySQL version requirement, updating your OS to a newer version, or if you believe this is a bug, please report this on GitHub.`
    }

    //Sorts versions in descending order
    selectedVersions.sort((a, b) => a < b ? 1 : -1)

    const selectedVersion = selectedVersions[0]

    const isRC = satisfies(selectedVersion, RC_MYSQL_VERSIONS)
    const isDMR = satisfies(selectedVersion, DMR_MYSQL_VERSIONS)
    
    let fileLocation: string = ''

    if (currentOS === 'win32') {
        fileLocation = `${major(selectedVersion)}.${minor(selectedVersion)}/mysql-${selectedVersion}${isRC ? '-rc' : isDMR ? '-dmr' : ''}-winx64.zip`
    } else if (currentOS === 'darwin') {
        const MySQLmacOSVersionNameKeys = Object.keys(MYSQL_MACOS_VERSIONS_IN_FILENAME);
        const macOSVersionNameKey = MySQLmacOSVersionNameKeys.find(range => satisfies(selectedVersion, range))
        fileLocation = `${major(selectedVersion)}.${minor(selectedVersion)}/mysql-${selectedVersion}${isRC ? '-rc' : isDMR ? '-dmr' : ''}-${MYSQL_MACOS_VERSIONS_IN_FILENAME[macOSVersionNameKey]}-${currentArch === 'x64' ? 'x86_64' : 'arm64'}.tar.gz`
    } else if (currentOS === 'linux') {
        const glibcVersionKeys = Object.keys(MYSQL_LINUX_GLIBC_VERSIONS);
        const glibcVersionKey = glibcVersionKeys.find(range => satisfies(selectedVersion, range))
        const glibcVersion = MYSQL_LINUX_GLIBC_VERSIONS[glibcVersionKey];

        const minimalInstallAvailableKeys = Object.keys(MYSQL_LINUX_MINIMAL_INSTALL_AVAILABLE);
        const minimalInstallAvailableKey = minimalInstallAvailableKeys.find(range => satisfies(selectedVersion, range))
        const minimalInstallAvailable = MYSQL_LINUX_MINIMAL_INSTALL_AVAILABLE[minimalInstallAvailableKey]

        fileLocation = `${major(selectedVersion)}.${minor(selectedVersion)}-linux-${minimalInstallAvailable !== 'no-glibc-tag' ? `glibc${glibcVersion}-` : ''}${currentArch === 'x64' ? 'x86_64' : 'arm64'}${minimalInstallAvailable !== 'no' ? '-minimal' : ''}.tar.xz`
    }

    return {
        version: selectedVersion,
        url: archiveBaseURL + fileLocation
    }
}