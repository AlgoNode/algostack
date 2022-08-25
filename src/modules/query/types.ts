import type Query from './Query.js';

export type QueryModule = typeof Query;
export type LookupMethods = Query['lookup'];
export type SearchMethods = Query['search'];

export interface QueryParams {
  limit?: number,
  [key: string]: string|number|boolean|undefined,
}
