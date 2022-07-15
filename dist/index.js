"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var lodash_1 = require("lodash");
var Query_1 = __importDefault(require("./modules/Query"));
var Algolib = /** @class */ (function () {
    function Algolib(options) {
        this.options = (0, lodash_1.merge)({
            mode: 'MAINNET',
            indexerAPI: 'https://mainnet-idx.algonode.cloud',
            nodeAPI: 'https://mainnet-api.algonode.cloud',
        }, options);
        this.query = new Query_1.default(this.options);
    }
    return Algolib;
}());
exports.default = Algolib;
