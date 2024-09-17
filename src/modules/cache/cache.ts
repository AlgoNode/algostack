import type AlgoStack from '../../index';

import Dexie, { Collection, DexieError, TransactionMode } from 'dexie';
import { IDBKeyRange, indexedDB } from 'fake-indexeddb';
import cloneDeep from 'lodash-es/cloneDeep.js';
import defaultsDeep from 'lodash-es/defaultsDeep.js';
import intersection from 'lodash-es/intersection.js';
import isEqual from 'lodash-es/isEqual.js';
import objHash from 'object-hash';

import { BaseModule } from '../_baseModule.js';
import { durationStringToMs } from '../../helpers/format.js';
import { CacheTable } from './enums.js';
import { CacheConfigs, CacheEntry, CacheQuery, IdbTxn } from './types.js';

/**
 * Cache module
 * ==================================================
 */
export default class Cache extends BaseModule {
  private configs: CacheConfigs = {
    namespace: 'algostack',
    tables: undefined,
    expiration: {
      default: '1h',
      [CacheTable.DB_STATE]: 'never',
      [CacheTable.INDEXER_ASSET]: '1h',
      [CacheTable.INDEXER_ASSET_BALANCES]: '2s',
      [CacheTable.INDEXER_ASSET_TRANSACTIONS]: '2s',
      [CacheTable.INDEXER_ASSETS]: '1m',
      [CacheTable.INDEXER_BLOCK]: '1w',
      [CacheTable.INDEXER_TXN]: '1w',
      [CacheTable.NODE_ACCOUNT]: '10s',
      [CacheTable.NODE_TEAL]: '1h',
      [CacheTable.NFD_LOOKUP]: '1h',
      [CacheTable.NFD_SEARCH]: '1m',
      [CacheTable.MEDIAS_ASSET]: '4h',
    },
    pruningInterval: undefined,
    autoClean: false,
    maxTxnsBatch: 100,
    logExpiration: false,
  };
  private db: Dexie;
  private v: number = 1;
  private tables: Record<string, string> = {};
  private queue: IdbTxn<any>[] = [];
  private get currentTables() {
    return this.db?.tables.map((table) => table.name) || [];
  }
  private isBusy: boolean = false;

  constructor(configs: CacheConfigs = {}) {
    super();
    const isBrowser = typeof window !== 'undefined';
    this.db = new Dexie(configs.namespace, {
      cache: 'disabled',
      ...(isBrowser && window.indexedDB ? {} : { indexedDB, IDBKeyRange }),
    });
    if (isBrowser) {
      window.addEventListener(
        'unhandledrejection',
        this.handleError.bind(this),
      );
    }
    this.setConfigs(configs);
  }

  public setConfigs(configs: CacheConfigs) {
    super.setConfigs(configs);
    configs.tables = [
      ...(this.configs.tables || []),
      ...(configs.tables || []),
    ];
    configs.persist = [
      ...(this.configs.persist || []),
      ...(configs.persist || []),
    ];
    this.configs = defaultsDeep(configs, this.configs);
  }

  public init(stack: AlgoStack) {
    super.init(stack);
    const stackVersion = this.stack?.configs?.version || 1;
    if (this.v > stackVersion) return;
    this.v = stackVersion;
    try {
      this.initTables();
      this.db.version(this.v).stores(this.tables);
      // Auto clean
      if (this.configs.autoClean) this.initAutoClean();
      // Auto prune
      if (this.configs.pruningInterval) this.initAutoPrune();
    } catch (e) {
      console.log(e);
      this.handleError(e);
    }
    return this;
  }

  private initTables() {
    let tables: Record<string, string> = {
      [CacheTable.DB_STATE]: '&key',
      ...this.tables,
    };

    if (this.stack) {
      // Query module
      if (this.stack.query) {
        tables = {
          ...tables,
          // indexer
          [CacheTable.INDEXER_ACCOUNT]: '&params',
          [CacheTable.INDEXER_ACCOUNT_ASSETS]: '&params',
          [CacheTable.INDEXER_ACCOUNT_APPLICATIONS]: '&params',
          [CacheTable.INDEXER_ACCOUNT_TRANSACTIONS]: '&params',
          [CacheTable.INDEXER_APPLICATION]: '&params',
          [CacheTable.INDEXER_APPLICATION_BOX]: '&params',
          [CacheTable.INDEXER_APPLICATION_BOXES]: '&params',
          [CacheTable.INDEXER_ASSET]: '&params',
          [CacheTable.INDEXER_ASSET_BALANCES]: '&params',
          [CacheTable.INDEXER_ASSET_TRANSACTIONS]: '&params',
          [CacheTable.INDEXER_BLOCK]: '&params',
          [CacheTable.INDEXER_TXN]: '&params',

          // node
          [CacheTable.NODE_ACCOUNT]: '&params',
          [CacheTable.NODE_ACCOUNT_APPLICATION]: '&params',
          [CacheTable.NODE_ACCOUNT_ASSET]: '&params',
          [CacheTable.NODE_BLOCK]: '&params',
          [CacheTable.NODE_BLOCK_PROOF]: '&params',
          [CacheTable.NODE_BLOCK_TRANSACTION_PROOF]: '&params',
          [CacheTable.NODE_TEAL]: '&params',

          // search
          [CacheTable.INDEXER_APPLICATIONS]: '&params',
          [CacheTable.INDEXER_ACCOUNTS]: '&params',
          [CacheTable.INDEXER_ASSETS]: '&params',
          [CacheTable.INDEXER_TXNS]: '&params',
        };
      }
      // NFDs
      if (this.stack.nfds) {
        tables = {
          ...tables,
          [CacheTable.NFD_LOOKUP]: '&address, nfd',
          [CacheTable.NFD_SEARCH]: '&params',
        };
      }
      // Medias
      if (this.stack.medias) {
        tables = {
          ...tables,
          [CacheTable.MEDIAS_ASSET]: '&id, [id+options]',
        };
      }
    }

    if (this.configs.tables?.length) {
      const extraStores: Record<string, string> = {};
      this.configs.tables.forEach((table) => {
        if (typeof table === 'string') extraStores[table] = '&params';
        else extraStores[table.name] = table.index || '&params';
      });
      tables = Object.fromEntries(
        Object.entries({ ...extraStores, ...tables }).sort(([a], [b]) =>
          a.localeCompare(b),
        ),
      );
    }

    this.tables = tables;
  }

  /**
   * Error handler
   * ==================================================
   */
  private async handleError(event: any) {
    const error = event?.reason as DexieError;
    const errorNames: string[] = [error?.name];
    if (error?.inner?.name) errorNames.push(error.inner.name);
    const fatal = [
      Dexie.errnames.Upgrade,
      Dexie.errnames.Version,
      Dexie.errnames.Schema,
    ];

    // Db is closed
    const dbIsClosed = errorNames.includes(Dexie.errnames.DatabaseClosed);
    if (dbIsClosed) {
      await this.db.open();
    }

    const shouldClearTables = intersection(errorNames, fatal)?.length;
    if (shouldClearTables) {
      console.log('An error occured while upgrading IndexedDB tables.');
    }
  }

  /**
   * Reset
   * ==================================================
   */
  private async clearAll() {
    const isOpen = this.db.isOpen();
    if (isOpen) this.db.close();
    await this.db.delete();
  }
  private async resetDb() {
    await this.clearAll();
    if (this.db.isOpen()) this.db.close();
    this.db.version(this.v).stores(this.tables);
    this.db.open();
  }

  /**
   * Transaction Queue
   * ==================================================
   */
  private commit<T>(
    scope: TransactionMode,
    table: string | string[],
    txn: () => Promise<T>,
  ): Promise<T> {
    const tables = Array.isArray(table) ? table : [table];
    const isMissingStores =
      intersection(tables, this.currentTables).length < tables.length;
    if (isMissingStores) {
      console.warn('Stores are missing', tables);
      return;
    }
    return new Promise((resolve) => {
      this.queue.push({ scope, tables, txn, resolve });
      if (!this.isBusy) this.runQueue();
    });
  }

  private async runQueue() {
    if (this.isBusy) return;
    if (!this.queue.length) return;
    this.isBusy = true;
    while (this.queue.length) {
      await this.runBatch();
    }
    this.isBusy = false;
  }

  private async runBatch() {
    if (!this.queue.length) return;
    const refTxn = this.queue[0];
    const scope = refTxn.scope;
    const tables = refTxn.tables;
    const batch: IdbTxn<any>[] = [];
    for (
      let i = 0;
      i < this.configs.maxTxnsBatch && i < this.queue.length;
      i++
    ) {
      const txn = this.queue[i];
      const isSimilar = txn.scope === scope && isEqual(txn.tables, tables);
      if (isSimilar) batch.push(txn);
      else break;
    }

    try {
      this.queue.splice(0, batch.length);
      await this.db.transaction(scope, tables, async () => {
        for (const txn of batch) {
          const results = await txn.txn();
          txn.resolve(results);
        }
      });
    } catch (e) {
      console.log('Dexie Txn error', e);
      console.log('scope:', scope, 'tables:', tables);
      if (!this.db.isOpen) this.db.open();
    }
  }

  /**
   * Get a collection bvased on a query
   * ==================================================
   */
  private async getCollection(
    tableName: string,
    query: CacheQuery,
  ): Promise<Collection | undefined> {
    let table = this.db[tableName];
    if (!table) {
      console.error(`Table not found (${tableName})`);
      return undefined;
    }

    if (query.orderBy) table = table.orderBy(query.orderBy);
    if (query.order && ['desc', 'DESC'].includes(query.order))
      table = table.desc();
    if (query.where) {
      const where = this.hashObjectProps(query.where);
      if (Object.keys(where).length) {
        table = table.where(this.hashObjectProps(query.where));
      }
    }
    if (query.filter) table = table.filter(query.filter);
    if (!query.includeExpired)
      table = table.filter(
        (entry: CacheEntry) => !this.isExpired(tableName, entry),
      );
    return table;
  }

  /**
   * Find an entry based on its ID and the query
   * ==================================================
   */
  public async find<Q extends CacheQuery>(
    tableName: string,
    query: Q,
  ): Promise<
    Q extends { limit: number }
      ? CacheEntry[] | undefined
      : CacheEntry | undefined
  > {
    if (!this.initiated) await this.waitForInit();
    return this.commit('r', tableName, async () => {
      const collection = await this.getCollection(tableName, query);
      if (!collection) return undefined;
      //
      // Return a single entry object
      // if no limit param is defined
      // Default behavior
      // --------------------------------------------------
      if (query.limit === undefined) return await collection.first();

      //
      // Find multiple entries
      // --------------------------------------------------
      return await collection.limit(query.limit).toArray();
    });
  }

  /**
   * Count the total entries in a table
   * ==================================================
   */
  public async count(tableName: string): Promise<number> {
    if (!this.initiated) await this.waitForInit();
    return this.commit('r', tableName, async () => {
      let table = this.db[tableName];
      if (!table) {
        console.error(`Table not found (${tableName})`);
        return undefined;
      }
      return await table.count();
    });
  }

  /**
   * Save an entry
   * ==================================================
   */
  public async save(tableName: string, data: any, entry: CacheEntry) {
    if (!this.initiated) await this.waitForInit();
    entry = {
      ...this.hashObjectProps(entry),
      data,
      timestamp: Date.now(),
    };
    return this.commit('rw', tableName, async () => {
      return await this.db[tableName].put(entry);
    });
  }

  public async bulkSave(
    tableName: string,
    entries: { data: any; entry: CacheEntry }[],
  ) {
    if (!this.initiated) await this.waitForInit();
    if (!entries.length) return;
    const timestamp = Date.now();
    const rows = entries.map((row) => ({
      ...this.hashObjectProps(row.entry),
      data: row.data,
      timestamp,
    }));
    return this.commit('rw', tableName, async () => {
      return await this.db[tableName].bulkPut(rows);
    });
  }

  /**
   * Delete en entry
   * ==================================================
   */
  public async delete(tableName: string, query: CacheQuery): Promise<number> {
    if (!this.initiated) await this.waitForInit();
    return this.commit('rw', tableName, async () => {
      const collection = await this.getCollection(tableName, query);
      if (!collection) return 0;
      return collection.delete();
    });
  }

  /**
   * Clear a table
   * ==================================================
   */
  public async clear(tableName: string): Promise<void> {
    if (!this.initiated) await this.waitForInit();
    return this.commit('rw', tableName, async () => {
      const table = this.db[tableName];
      if (!table) {
        console.error(`Table not found (${tableName})`);
        return;
      }
      await table.clear();
    });
  }

  /**
   * Prepare cache entry
   * ==================================================
   */
  private hashObjectProps(entry: CacheEntry = {}) {
    if (typeof entry !== 'object') return entry;
    const result = cloneDeep(entry);
    Object.entries(result).forEach(([key, value]) => {
      if (typeof value === 'object' && !Array.isArray(value))
        return (result[key] = objHash(value));
      if (value === null || value === undefined) return delete result[key];
    });
    return result;
  }

  /**
   * Expiration
   * ==================================================
   */
  public isExpired(tableName: string, entry: CacheEntry) {
    if (this.configs.expiration[tableName] === 'never') return false;
    const expiration = this.getExpiration(tableName);
    const isExpired = entry.timestamp + expiration < Date.now();
    if (isExpired && this.configs.logExpiration)
      console.warn(`[${tableName}] Cache entry has expired.`);
    return isExpired;
  }

  private getExpiration(tableName: string) {
    const expirationStr =
      this.configs.expiration[tableName] || this.configs.expiration.default;
    return durationStringToMs(expirationStr);
  }

  /**
   * Pruning
   * Remove expired entries
   * ==================================================
   */
  public async prune(tables?: string | string[]) {
    if (!this.initiated) await this.waitForInit();
    const pruned = {};
    if (tables === undefined) tables = this.currentTables;
    else if (typeof tables === 'string') tables = [tables];
    if (this.configs.persist?.length) {
      tables = tables.filter((table) => !this.configs.persist.includes(table));
    }
    for (let i = 0; i < tables.length; i++) {
      const tableName = tables[i];
      // continue to the next table if it never expires
      if (this.configs.expiration[tableName] === 'never') continue;
      const expirationLimit = Date.now() - this.getExpiration(tableName);
      const expired = await this.commit('rw', tableName, async () => {
        const table = this.db[tableName];
        const expired = await table
          .filter((entry) => entry.timestamp < expirationLimit)
          .delete();
        return expired;
      });
      if (expired) pruned[tableName] = expired;
    }
    return pruned;
  }

  private async autoPrune() {
    const now = Date.now();
    const lastTimestamp = await this.find(CacheTable.DB_STATE, {
      where: { key: 'prunedAt' },
    });
    const pruneAfter = durationStringToMs(this.configs.pruningInterval);
    const nextPruning = (lastTimestamp?.timestamp || 0) + pruneAfter;
    if (now < nextPruning) return;

    const pruned = await this.prune();
    await this.save(CacheTable.DB_STATE, null, { key: 'prunedAt' });
    console.warn('Caches pruned: ', pruned);
  }

  private async initAutoPrune() {
    if (!this.initiated) await this.waitForInit();
    if (!this.configs.pruningInterval) return;
    const interval = durationStringToMs(this.configs.pruningInterval);
    setInterval(this.autoPrune.bind(this), interval);
  }

  /**
   * Cleaning
   * Empties tables that are not persisted
   * ==================================================
   */
  public async clean(tables?: string | string[]) {
    if (!this.initiated) await this.waitForInit();
    const cleaned = [];
    if (tables === undefined) tables = this.currentTables;
    else if (typeof tables === 'string') tables = [tables];
    const persisted = [CacheTable.DB_STATE, ...(this.configs.persist || [])];
    tables = tables.filter((table) => !persisted.includes(table));
    for (let i = 0; i < tables.length; i++) {
      const tableName = tables[i];
      const success = await this.commit('rw', tableName, async () => {
        const table = this.db[tableName];
        await table.clear();
        return table;
      });
      if (success) cleaned.push(tableName);
    }
    return cleaned;
  }

  private async initAutoClean() {
    if (!this.initiated) await this.waitForInit();
    if (this.configs.autoClean) await this.clean();
  }
}
