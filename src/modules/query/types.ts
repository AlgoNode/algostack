import type {
  Asset,
  Account,
  Application,
  Transaction,
  Block,
} from "algosdk/src/client/v2/indexer/models/types.js";
import type { AxiosInstance } from "axios";
import type Query from "./query.js";
import { ApiUrl } from "./enums.js";
import { CacheTable } from "../cache/enums.js";
import { PromiseResolver } from "../../types.js";
import { AddonsList, AddonsKeyMap } from "../addons/types.js";

export type LookupMethods = Query["lookup"];
export type SearchMethods = Query["search"];

export interface QueryConfigs {
  client?: AxiosInstance;
  rateLimiter?: RateLimiterConfig;
  rateLimiters?: Record<string, RateLimiterConfig>;
}

export interface QueryOptions {
  base?: ApiUrl;
  endpoint: string;
  params: QueryParams;
  addons?: AddonsList | AddonsKeyMap;
}

export interface QueryParams {
  limit?: number;
  cacheTable?: CacheTable | string;
  noCache?: boolean;
  refreshCache?: boolean;
  rateLimiter?: string;
  addons?: AddonsList | AddonsKeyMap;
  filter?: (item: Payload) => boolean;
  headers?: Payload;
  [key: string]: string | number | boolean | Payload | undefined;
}

export type QueryQueue = Map<string, PromiseResolver[]>;

export type Payload = Record<string, any>;

export type FilterFn = (item: Payload) => boolean;

export type RateLimiter = <T>(fn: () => Promise<T>) => Promise<T>;
export interface RateLimiterConfig {
  interval?: number;
  rate?: number;
  concurrency?: number;
}

export type PayloadWithAddons = { addons: Payload };
export type AssetPayload = Asset & PayloadWithAddons;
export type AccountPayload = Account & PayloadWithAddons;
export type ApplicationPayload = Application & PayloadWithAddons;
export type TransactionPayload = Transaction & PayloadWithAddons;
export type BlockPayload = Block & PayloadWithAddons;
