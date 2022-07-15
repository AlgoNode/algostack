"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringifyObjectValues = void 0;
function stringifyObjectValues(params) {
    var obj = {};
    Object.entries(params)
        .forEach(function (_a) {
        var key = _a[0], value = _a[1];
        obj[key] = String(value);
    });
    return obj;
}
exports.stringifyObjectValues = stringifyObjectValues;
