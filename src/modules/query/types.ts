import type Query from './query.js';
import { Addon } from '../addons/index.js';

export type LookupMethods = Query['lookup'];
export type SearchMethods = Query['search'];

export interface QueryOptions {
  base?: 'indexerUrl'|'apiUrl',
  endpoint: string, 
  store: string|null, 
  queryParams: QueryParams, 
  addons?: Addon[]
}

export interface QueryParams {
  limit?: number,
  noCache?: boolean,
  refreshCache?: boolean,
  [key: string]: string|number|boolean|Record<string,any>|undefined,
}


export type Payload = Record<string, any>;
