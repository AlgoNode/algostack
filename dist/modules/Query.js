"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var axios_1 = __importDefault(require("axios"));
var camelcase_keys_1 = __importDefault(require("camelcase-keys"));
var Base_1 = __importDefault(require("./Base"));
var object_1 = require("../helpers/object");
//
// QUERY class
// ----------------------------------------------
var Query = /** @class */ (function (_super) {
    __extends(Query, _super);
    function Query() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return _super.apply(this, args) || this;
    }
    //
    // Fetch data
    // ----------------------------------------------
    Query.prototype.fetchData = function (endpoint, params) {
        if (params === void 0) { params = {}; }
        return __awaiter(this, void 0, void 0, function () {
            var stringParams, queryString, response, data, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        stringParams = (0, object_1.stringifyObjectValues)(params);
                        queryString = new URLSearchParams(stringParams).toString();
                        return [4 /*yield*/, axios_1.default.get("".concat(this.options.indexerAPI).concat(endpoint, "?").concat(queryString))];
                    case 1:
                        response = _a.sent();
                        data = (0, camelcase_keys_1.default)(response.data, { deep: true });
                        return [2 /*return*/, data];
                    case 2:
                        error_1 = _a.sent();
                        console.dir(error_1);
                        return [2 /*return*/, {}];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    //
    // Query wrapper
    // ----------------------------------------------
    Query.prototype.get = function (endpoint, params) {
        if (params === void 0) { params = {}; }
        return __awaiter(this, void 0, void 0, function () {
            var loop, data, nextData;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        loop = params.limit === -1;
                        if (loop)
                            delete params.limit;
                        return [4 /*yield*/, this.fetchData(endpoint, params)];
                    case 1:
                        data = _a.sent();
                        if (!loop) return [3 /*break*/, 4];
                        _a.label = 2;
                    case 2:
                        if (!data['next-token']) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.fetchData(endpoint, __assign(__assign({}, params), { next: data['next-token'] }))];
                    case 3:
                        nextData = _a.sent();
                        delete data['next-token'];
                        // merge arrays, including possible new 'next-token'
                        Object.entries(nextData).forEach(function (_a) {
                            var key = _a[0], value = _a[1];
                            if (value.length !== undefined && data[key])
                                data[key] = __spreadArray(__spreadArray([], data[key], true), value, true);
                            else
                                data[key] = value;
                        });
                        return [3 /*break*/, 2];
                    case 4: return [2 /*return*/, data];
                }
            });
        });
    };
    //
    // Quick methods
    // ----------------------------------------------
    // accounts
    Query.prototype.account = function (accountId, params) {
        if (params === void 0) { params = {}; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.get("/v2/accounts/".concat(accountId), params)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    Query.prototype.accountTransactions = function (accountId, params) {
        if (params === void 0) { params = {}; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.get("/v2/accounts/".concat(accountId, "/transactions"), params)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // app
    Query.prototype.application = function (appId, params) {
        if (params === void 0) { params = {}; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.get("/v2/applications/".concat(appId), params)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // asset
    Query.prototype.asset = function (assetId, params) {
        if (params === void 0) { params = {}; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.get("/v2/assets/".concat(assetId), params)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    Query.prototype.assetBalances = function (assetId, params) {
        if (params === void 0) { params = {}; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.get("/v2/assets/".concat(assetId, "/balances"), params)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    Query.prototype.assetTransactions = function (assetId, params) {
        if (params === void 0) { params = {}; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.get("/v2/assets/".concat(assetId, "/transactions"), params)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // block
    Query.prototype.lookupBlock = function (round, params) {
        if (params === void 0) { params = {}; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.get("/v2/blocks/".concat(round), params)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // transaction
    Query.prototype.transaction = function (id, params) {
        if (params === void 0) { params = {}; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.get("/v2/transactions/".concat(id), params)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    //search
    Query.prototype.accounts = function (params) {
        if (params === void 0) { params = {}; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.get("/v2/accounts", params)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    Query.prototype.applications = function (params) {
        if (params === void 0) { params = {}; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.get("/v2/applications", params)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    Query.prototype.assets = function (params) {
        if (params === void 0) { params = {}; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.get("/v2/assets", params)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    Query.prototype.transactions = function (params) {
        if (params === void 0) { params = {}; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.get("/v2/transactions", params)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    return Query;
}(Base_1.default));
exports.default = Query;
