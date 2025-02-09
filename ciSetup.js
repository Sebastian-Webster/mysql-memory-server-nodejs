const { normalize } = require("path");

process.env.useCIDBPath = true;

const GitHubActionsTempFolder = process.platform === 'win32' ? 'C:\\Users\\RUNNER~1\\mysqlmsn' : '/tmp/mysqlmsn'

process.env.mysqlmsn_internal_DO_NOT_USE_databaseDirectoryPath = normalize(GitHubActionsTempFolder + '/dbs')
process.env.mysqlmsn_internal_DO_NOT_USE_binaryDirectoryPath = normalize(GitHubActionsTempFolder + '/binaries')

process.env.mysqlmsn_internal_DO_NOT_USE_deleteDBAfterStopped = false;
