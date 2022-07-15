"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var Options_1 = __importDefault(require("./modules/Options"));
var Filters_1 = __importDefault(require("./modules/Filters"));
var Query_1 = __importDefault(require("./modules/Query"));
var Algolib = /** @class */ (function () {
    function Algolib(userOptions) {
        this.options = new Options_1.default(userOptions);
        this.filters = new Filters_1.default(this);
        this.query = new Query_1.default(this);
    }
    return Algolib;
}());
exports.default = Algolib;
