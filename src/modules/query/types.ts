import type Query from './query.js';

export type LookupMethods = Query['lookup'];
export type SearchMethods = Query['search'];

export interface QueryParams {
  limit?: number,
  noCache?: boolean,
  refreshCache?: boolean,
  [key: string]: string|number|boolean|undefined,
}


export type Payload = Record<string, any>;
