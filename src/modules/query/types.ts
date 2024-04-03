import type { AxiosInstance } from 'axios';
import { ApiUrl } from './enums.js';
import type Query from './query.js';
import { CacheTable } from '../cache/enums.js';

export type LookupMethods = Query['lookup'];
export type SearchMethods = Query['search'];

export interface QueryConfigs { 
  client?: AxiosInstance,
  rateLimiter?: RateLimiterConfig,
  rateLimiters?: Record<string, RateLimiterConfig>,
}

export interface QueryOptions {
  base?: ApiUrl,
  endpoint: string, 
  params: QueryParams, 
  addons?: AddonsList | AddonsMap,
}

export interface QueryParams {
  limit?: number,
  cacheTable?: CacheTable|string,
  noCache?: boolean,
  refreshCache?: boolean,
  rateLimiter?: string,
  addons?: AddonsList | AddonsMap,
  filter?: (item: Payload) => boolean,
  headers?: Payload,
  [key: string]: string|number|boolean|Payload|undefined,
}

export type PromiseResolver = (arg: unknown) => void;
export type QueryQueue = Map<string, PromiseResolver[]>;

export type Payload = Record<string, any>;

export type FilterFn = (item: Payload) => boolean;
export type AddonFn = (item: Payload) => void;
export type AddonsMap = Map<string, AddonFn[]>
export type AddonsList = AddonFn[];

export type RateLimiter = <T>(fn: () => Promise<T>) => Promise<T>;
export interface RateLimiterConfig {
  interval?: number,
  rate?: number,
  concurrency?: number,
}