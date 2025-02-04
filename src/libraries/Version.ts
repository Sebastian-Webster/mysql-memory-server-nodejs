import { BinaryInfo, JSRuntimeVersion } from "../../types";
import * as os from 'os'
import { satisfies, coerce, lt, major, minor } from "semver";
import { archiveBaseURL, DMR_MYSQL_VERSIONS, DOWNLOADABLE_MYSQL_VERSIONS, MYSQL_ARCH_SUPPORT, MYSQL_LINUX_FILE_EXTENSIONS, MYSQL_LINUX_GLIBC_VERSIONS, MYSQL_LINUX_MINIMAL_INSTALL_AVAILABLE, MYSQL_MACOS_VERSIONS_IN_FILENAME, MYSQL_MIN_OS_SUPPORT, RC_MYSQL_VERSIONS, MYSQL_LINUX_MINIMAL_REBUILD_VERSIONS } from "../constants";
import etcOSRelease from "./LinuxOSRelease";

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

    if (process.platform === 'linux' && etcOSRelease.NAME === 'Ubuntu' && etcOSRelease.VERSION_ID >= '24.04') {
        //Since Ubuntu >= 24.04 uses libaio1t64 instead of libaio, this package has to copy libaio1t64 into a folder that MySQL looks in for dynamically linked libraries with the filename "libaio.so.1".
        //I have not been able to find a suitable folder for libaio1t64 to be copied into for MySQL < 8.0.4, so here we are filtering all versions lower than 8.0.4 since they fail to launch in Ubuntu 24.04.
        //If there is a suitable filepath for libaio1t64 to be copied into for MySQL < 8.0.4 then this check can be removed and these older MySQL versions can run on Ubuntu.
        //Pull requests are welcome for adding >= Ubuntu 24.04 support for MySQL < 8.0.4.
        //A way to get MySQL running on Ubuntu >= 24.04 is to symlink libaio1t64 to the location libaio would be. It is not suitable for this package to be doing that automatically, so instead this package has been copying libaio1t64 into the MySQL binary folder.
        selectedVersions = selectedVersions.filter(v => !lt(v, '8.0.4'))
    }

    if (selectedVersions.length === 0) {
        throw `You are running a version of Ubuntu that is too modern to run any MySQL versions with this package that match the following version requirement: ${versionToGet}. Please choose a newer version of MySQL to use, or if you believe this is a bug please report this on GitHub.`
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

        const fileExtensionKeys = Object.keys(MYSQL_LINUX_FILE_EXTENSIONS);
        const fileExtensionKey = fileExtensionKeys.find(range => satisfies(selectedVersion, range))
        const fileExtension = MYSQL_LINUX_FILE_EXTENSIONS[fileExtensionKey]

        fileLocation = `${major(selectedVersion)}.${minor(selectedVersion)}/mysql-${selectedVersion}${isRC ? '-rc' : isDMR ? '-dmr' : ''}-linux-${minimalInstallAvailable !== 'no-glibc-tag' ? `glibc${glibcVersion}-` : ''}${currentArch === 'x64' ? 'x86_64' : 'arm64'}${minimalInstallAvailable !== 'no' ? `-minimal${satisfies(selectedVersion, MYSQL_LINUX_MINIMAL_REBUILD_VERSIONS) ? '-rebuild' : ''}` : ''}.tar.${fileExtension}`
    }

    return {
        version: selectedVersion,
        url: archiveBaseURL + fileLocation
    }
}

export function getJSRuntimeVersion(): JSRuntimeVersion {
    if (process.versions.bun) {
        return {
            runtimeName: 'Bun',
            runtimeVersion: process.versions.bun
        }
    }

    return {
        runtimeName: 'NodeJS',
        runtimeVersion: process.versions.node
    }
}