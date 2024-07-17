import { TransactionMode } from "dexie";
import { PromiseResolver } from "../../types.js";

export interface CacheConfigs {
  namespace?: string,
  // Custom Cache Stores
  // For custom query endpoints, 
  // ...or anything else you want to cache using the cache module
  // cache will be indexed using the params object
  tables?: (string|{ name: string, index: string })[],
  
  // Cache expiration 
  // Format: 1w, 1d, 1h, 1m, 1s, 1ms 
  // Works with custom stores too!
  expiration?: {
    default?: DurationString,
    [k:string]: DurationString,
  },
  
  // Auto prune the cache at X interval
  pruningInterval?: DurationString,

  // A list of stores to persist when pruning
  persist?: string[],

  // Batch transactions sequences that have the same tables and scope
  maxTxnsBatch?: number,

  
  // logs
  logExpiration?: boolean,
}

export type DurationString = string|'never';

export type CacheEntry = Record<string, any>;
export type CacheWhere = Record<string, any>; 
export type CacheFilter = (entry: CacheEntry) => boolean;
export type CacheBulkEntry = { data: any, entry: CacheEntry };
export type CacheBulkEntries = CacheBulkEntry[];

export interface CacheQuery {
  where?: CacheWhere,
  filter?: CacheFilter,
  limit?: number,
  orderBy?: string,
  order?: 'asc'|'ASC'|'desc'|'DESC',
  includeExpired?: boolean, 
}

export interface IdbTxn<T> {
  scope: TransactionMode,
  tables: string[],
  txn: () => Promise<T>,
  resolve: PromiseResolver,
}