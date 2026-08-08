"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSupportedOS = isSupportedOS;
exports.isValidOption = isValidOption;
const constants_1 = require("./constants");
function isSupportedOS(os) {
    return os in constants_1.MYSQL_MIN_OS_SUPPORT;
}
function isValidOption(name) {
    return name in constants_1.OPTION_TYPE_CHECKS;
}
