import type Query from './query.js';

export type LookupMethods = Query['lookup'];
export type SearchMethods = Query['search'];

export interface QueryParams {
  limit?: number,
  [key: string]: string|number|boolean|undefined,
}


export type Payload = Record<string, any>;
