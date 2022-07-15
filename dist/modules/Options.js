"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//
// Options class
// ----------------------------------------------
var Options = /** @class */ (function () {
    function Options(userOptions) {
        this.mode = 'MAINNET';
        this.indexerAPI = 'https://mainnet-idx.algonode.cloud';
        this.nodeAPI = 'https://mainnet-api.algonode.cloud';
        this.convertCase = 'none';
        Object.assign(this, userOptions);
    }
    return Options;
}());
exports.default = Options;
