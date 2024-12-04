import type Query from './query.js';
import type { indexerModels as IndexerModels } from 'algosdk';
import type { AxiosInstance } from 'axios';

import { PromiseResolver } from '../../types.js';
import { AddonsKeyMap, AddonsList } from '../addons/types.js';
import { CacheTable } from '../cache/enums.js';
import { ApiUrl } from './enums.js';

export type LookupMethods = Query['lookup'];
export type SearchMethods = Query['search'];

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
export type AssetPayload = IndexerModels.Asset & PayloadWithAddons;
export type AccountPayload = IndexerModels.Account & PayloadWithAddons;
export type ApplicationPayload = IndexerModels.Application & PayloadWithAddons;
export type TransactionPayload = IndexerModels.Transaction & PayloadWithAddons;
export type BlockPayload = IndexerModels.Block & PayloadWithAddons;
