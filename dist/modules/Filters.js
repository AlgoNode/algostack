"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var camelcase_keys_1 = __importDefault(require("camelcase-keys"));
var snakecase_keys_1 = __importDefault(require("snakecase-keys"));
var kebabcase_keys_1 = __importDefault(require("kebabcase-keys"));
//
// Filters class
// ----------------------------------------------
var Filters = /** @class */ (function () {
    function Filters(forwarded) {
        this.convertCaseOut = this.convertCase;
        this.options = forwarded.options;
    }
    //
    // Convert object key case
    // ----------------------------------------------
    Filters.prototype.convertCase = function (obj, toCase) {
        if (toCase === void 0) { toCase = this.options.convertCase; }
        if (toCase === 'none')
            return obj;
        if (toCase === 'camelcase')
            return (0, camelcase_keys_1.default)(obj, { deep: true });
        if (toCase === 'snakecase')
            return (0, snakecase_keys_1.default)(obj, { deep: true });
        if (toCase === 'kebabcase')
            return (0, kebabcase_keys_1.default)(obj, { deep: true });
    };
    Filters.prototype.convertCaseIn = function (obj) {
        if (this.options.convertCase === 'none')
            return obj;
        return (0, kebabcase_keys_1.default)(obj, { deep: true });
    };
    //
    // Convert object values to strings
    // ----------------------------------------------
    Filters.prototype.stringifyValues = function (params) {
        var obj = {};
        Object.entries(params)
            .forEach(function (_a) {
            var key = _a[0], value = _a[1];
            obj[key] = String(value);
        });
        return obj;
    };
    return Filters;
}());
exports.default = Filters;
