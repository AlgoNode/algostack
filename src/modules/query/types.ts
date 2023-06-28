import { ApiUrl } from './enums.js';
import type Query from './query.js';

export type LookupMethods = Query['lookup'];
export type SearchMethods = Query['search'];

export interface QueryConfigs { }

export interface QueryOptions {
  base?: ApiUrl,
  endpoint: string, 
  store: string|null, 
  params: QueryParams, 
  addons?: Addons,
}

export interface QueryParams {
  limit?: number,
  noCache?: boolean,
  refreshCache?: boolean,
  addons?: Addons,
  filter?: (item: Payload) => boolean,
  [key: string]: string|number|boolean|Payload|undefined,
}


export type Payload = Record<string, any>;


export type FilterFn = (item: Payload) => boolean;
export type AddonFn = (item: Payload) => void;
export type Addons = AddonFn[] | Record<string, AddonFn[]>