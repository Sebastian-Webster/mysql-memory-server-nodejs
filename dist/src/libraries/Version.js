"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getBinaryURL;
const os = __importStar(require("os"));
const semver_1 = require("semver");
const constants_1 = require("../constants");
const LinuxOSRelease_1 = __importStar(require("./LinuxOSRelease"));
function getBinaryURL(versionToGet = "x", currentArch) {
    let selectedVersions = constants_1.DOWNLOADABLE_MYSQL_VERSIONS.filter(version => (0, semver_1.satisfies)(version, versionToGet));
    if (selectedVersions.length === 0) {
        throw `mysql-memory-server does not support downloading a version of MySQL that fits the following version requirement: ${versionToGet}. This package only supports downloads of MySQL for MySQL >= ${constants_1.DOWNLOADABLE_MYSQL_VERSIONS[0]} <= ${constants_1.DOWNLOADABLE_MYSQL_VERSIONS[constants_1.DOWNLOADABLE_MYSQL_VERSIONS.length - 1]}. Please check for typos, choose a different version of MySQL to use, or make an issue or pull request on GitHub if you belive this is a bug.`;
    }
    const currentOS = os.platform();
    const OSVersionSupport = constants_1.MYSQL_MIN_OS_SUPPORT[currentOS];
    if (!OSVersionSupport)
        throw `MySQL and/or mysql-memory-server does not support your operating system. Please make sure you are running the latest version of mysql-memory-server or try running on a different operating system or report an issue on GitHub if you believe this is a bug.`;
    const OSSupportVersionRanges = Object.keys(OSVersionSupport);
    selectedVersions = selectedVersions.filter(possibleVersion => {
        const OSKey = OSSupportVersionRanges.find(item => (0, semver_1.satisfies)(possibleVersion, item));
        return !!OSKey;
    });
    if (selectedVersions.length === 0) {
        throw `No version of MySQL could be found that supports your operating system and fits the following version requirement: ${versionToGet}. Please check for typos, choose a different version of MySQL to run, or if you think this is a bug, please report this on GitHub.`;
    }
    const archSupport = constants_1.MYSQL_ARCH_SUPPORT[currentOS][currentArch];
    if (!archSupport) {
        if (currentOS === 'win32' && currentArch === 'arm64')
            throw 'mysql-memory-server has detected you are running Windows on ARM. MySQL does not support Windows on ARM. To get this package working, please try setting the "arch" option to "x64".';
        throw `MySQL and/or mysql-memory-server does not support the CPU architecture you want to use (${currentArch}). Please make sure you are using the latest version of mysql-memory-server or try using a different architecture, or if you believe this is a bug, please report this on GitHub.`;
    }
    selectedVersions = selectedVersions.filter(possibleVersion => (0, semver_1.satisfies)(possibleVersion, archSupport));
    if (selectedVersions.length === 0) {
        throw `No version of MySQL could be found that supports the CPU architecture ${currentArch === os.arch() ? 'for your system' : 'you have chosen'} (${currentArch}). Please try choosing a different version of MySQL, or if you believe this is a bug, please report this on GitHub.`;
    }
    const versionsBeforeOSVersionCheck = selectedVersions.slice();
    const coercedOSRelease = (0, semver_1.coerce)(os.release());
    selectedVersions = selectedVersions.filter(possibleVersion => {
        const OSVersionKey = OSSupportVersionRanges.find(item => (0, semver_1.satisfies)(possibleVersion, item));
        return !(0, semver_1.lt)(coercedOSRelease, OSVersionSupport[OSVersionKey]);
    });
    if (selectedVersions.length === 0) {
        const versionKeys = new Set();
        for (const v of versionsBeforeOSVersionCheck) {
            versionKeys.add(OSSupportVersionRanges.find(item => (0, semver_1.satisfies)(v, item)));
        }
        const minVersions = Array.from(versionKeys).map(v => OSVersionSupport[v]);
        //Sorts versions in ascending order
        minVersions.sort((a, b) => a < b ? -1 : 1);
        const minVersion = minVersions[0];
        throw `Your operating system is too out of date to run a version of MySQL that fits the following requirement: ${versionToGet}. The oldest version for your operating system that you would need to get a version that satisfies the version requirement is ${minVersion} but your current operating system is ${coercedOSRelease.version}. Please try changing your MySQL version requirement, updating your OS to a newer version, or if you believe this is a bug, please report this on GitHub.`;
    }
    if (process.platform === 'linux') {
        if (LinuxOSRelease_1.default.NAME === 'Ubuntu' && LinuxOSRelease_1.default.VERSION_ID >= '24.04') {
            //Since Ubuntu >= 24.04 uses libaio1t64 instead of libaio, this package has to copy libaio1t64 into a folder that MySQL looks in for dynamically linked libraries with the filename "libaio.so.1".
            //I have not been able to find a suitable folder for libaio1t64 to be copied into for MySQL < 8.0.4, so here we are filtering all versions lower than 8.0.4 since they fail to launch in Ubuntu 24.04.
            //If there is a suitable filepath for libaio1t64 to be copied into for MySQL < 8.0.4 then this check can be removed and these older MySQL versions can run on Ubuntu.
            //Pull requests are welcome for adding >= Ubuntu 24.04 support for MySQL < 8.0.4.
            //A way to get MySQL running on Ubuntu >= 24.04 is to symlink libaio1t64 to the location libaio would be. It is not suitable for this package to be doing that automatically, so instead this package has been copying libaio1t64 into the MySQL binary folder.
            selectedVersions = selectedVersions.filter(v => !(0, semver_1.lt)(v, '8.0.4'));
            if (selectedVersions.length === 0) {
                throw `You are running a version of Ubuntu that is too modern to run any MySQL versions with this package that match the following version requirement: ${versionToGet}. Please choose a newer version of MySQL to use, or if you believe this is a bug please report this on GitHub.`;
            }
        }
        else if (LinuxOSRelease_1.isOnAlpineLinux) {
            //https://github.com/Sebastian-Webster/mysql-server-musl-binaries only has support for v8.4.x and 9.x binaries
            selectedVersions = selectedVersions.filter(v => (0, semver_1.satisfies)(v, '8.4.x') || (0, semver_1.satisfies)(v, '9.x'));
            if (selectedVersions.length === 0) {
                throw 'mysql-memory-server has detected you are running this package on Alpine Linux. The source for MySQL with musl libc only provides binaries for MySQL 8.4.x and 9.x and as such only those versions can be used with this package. Please use 8.4.x or 9.x.';
            }
        }
    }
    //Sorts versions in descending order
    selectedVersions.sort((a, b) => a < b ? 1 : -1);
    const selectedVersion = selectedVersions[0];
    const isRC = (0, semver_1.satisfies)(selectedVersion, constants_1.RC_MYSQL_VERSIONS);
    const isDMR = (0, semver_1.satisfies)(selectedVersion, constants_1.DMR_MYSQL_VERSIONS);
    let fileLocation = '';
    let xPluginSupported = true;
    if (currentOS === 'win32') {
        fileLocation = `${(0, semver_1.major)(selectedVersion)}.${(0, semver_1.minor)(selectedVersion)}/mysql-${selectedVersion}${isRC ? '-rc' : isDMR ? '-dmr' : ''}-winx64.zip`;
    }
    else if (currentOS === 'darwin') {
        const MySQLmacOSVersionNameKeys = Object.keys(constants_1.MYSQL_MACOS_VERSIONS_IN_FILENAME);
        const macOSVersionNameKey = MySQLmacOSVersionNameKeys.find(range => (0, semver_1.satisfies)(selectedVersion, range));
        fileLocation = `${(0, semver_1.major)(selectedVersion)}.${(0, semver_1.minor)(selectedVersion)}/mysql-${selectedVersion}${isRC ? '-rc' : isDMR ? '-dmr' : ''}-${constants_1.MYSQL_MACOS_VERSIONS_IN_FILENAME[macOSVersionNameKey]}-${currentArch === 'x64' ? 'x86_64' : 'arm64'}.tar.gz`;
    }
    else if (LinuxOSRelease_1.isOnAlpineLinux) {
        fileLocation = `https://github.com/Sebastian-Webster/mysql-server-musl-binaries/releases/download/current/mysql-musl-${selectedVersion}-${currentArch === 'x64' ? 'x86_64' : 'arm64'}.tar.gz`;
        xPluginSupported = false;
    }
    else if (currentOS === 'linux') {
        const glibcObject = constants_1.MYSQL_LINUX_GLIBC_VERSIONS[currentArch];
        const glibcVersionKeys = Object.keys(glibcObject);
        const glibcVersionKey = glibcVersionKeys.find(range => (0, semver_1.satisfies)(selectedVersion, range));
        const glibcVersion = glibcObject[glibcVersionKey];
        const minimalInstallAvailableKeys = Object.keys(constants_1.MYSQL_LINUX_MINIMAL_INSTALL_AVAILABLE);
        const minimalInstallAvailableKey = minimalInstallAvailableKeys.find(range => (0, semver_1.satisfies)(selectedVersion, range));
        const minimalInstallAvailable = constants_1.MYSQL_LINUX_MINIMAL_INSTALL_AVAILABLE[minimalInstallAvailableKey];
        const fileExtensionObject = constants_1.MYSQL_LINUX_FILE_EXTENSIONS[currentArch];
        const fileExtensionKeys = Object.keys(fileExtensionObject);
        const fileExtensionKey = fileExtensionKeys.find(range => (0, semver_1.satisfies)(selectedVersion, range));
        const fileExtension = constants_1.MYSQL_LINUX_FILE_EXTENSIONS[currentArch][fileExtensionKey];
        fileLocation = `${(0, semver_1.major)(selectedVersion)}.${(0, semver_1.minor)(selectedVersion)}/mysql-${selectedVersion}${isRC ? '-rc' : isDMR ? '-dmr' : ''}-linux-${minimalInstallAvailable !== 'no-glibc-tag' ? `glibc${glibcVersion}-` : ''}${currentArch === 'x64' ? 'x86_64' : 'aarch64'}${minimalInstallAvailable !== 'no' && (process.arch !== 'arm64' ? true : (0, semver_1.satisfies)(selectedVersion, constants_1.MYSQL_LINUX_MINIMAL_INSTALL_AVAILABLE_ARM64)) ? `-minimal${(0, semver_1.satisfies)(selectedVersion, constants_1.MYSQL_LINUX_MINIMAL_REBUILD_VERSIONS) ? '-rebuild' : ''}` : ''}.tar.${fileExtension}`;
    }
    else {
        throw 'You are running this package on an unsupported OS. Please use either Windows, macOS, or a Linux-based OS.';
    }
    return {
        version: selectedVersion,
        url: fileLocation,
        hostedByOracle: !LinuxOSRelease_1.isOnAlpineLinux, // Only the Alpine Linux binaries are not hosted on the MySQL CDN.
        xPluginSupported
    };
}
