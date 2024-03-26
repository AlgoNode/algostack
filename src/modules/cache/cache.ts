import { durationStringToMs } from '../../helpers/format.js';
import { CacheConfigs, CacheEntry, CacheQuery, IdbTxn } from './types.js';
import { BaseModule } from '../_baseModule.js';
import { indexedDB, IDBKeyRange } from "fake-indexeddb";
import Dexie, { Collection, DexieError, TransactionMode } from 'dexie';
import objHash from 'object-hash';
import AlgoStack, { PromiseResolver } from '../../index.js';
import merge from 'lodash-es/merge.js';
import intersection from 'lodash-es/intersection.js';
import cloneDeep from 'lodash-es/cloneDeep.js';
import { wait } from '../../utils/process.js';
import { CacheTable } from './enums.js';


/**
 * Cache module
 * ==================================================
 */
export default class Cache extends BaseModule {
  private db: Dexie;
  private v: number = 1;
  private configs: CacheConfigs = {};
  private tables: Record<string,string> = {};
  private queue: IdbTxn<any>[] = [];
  private get currentTables() { return this.db?.tables.map(table => table.name) || [] };
  private _isReady: boolean = false;
  private get isReady() { return this._isReady };
  private set isReady(value: boolean) {
    this._isReady = value;
    if (value === true) this.runQueue();
  }

  constructor(configs: CacheConfigs = {}) {
    super();
    const isBrowser = typeof window !== 'undefined'; 
    this.db = new Dexie(
      configs.namespace, 
      isBrowser && window.indexedDB 
        ? undefined
        : { indexedDB, IDBKeyRange }
      );
    if (isBrowser) {
      window.addEventListener('unhandledrejection', this.handleError.bind(this))
    }
    this.setConfigs(configs);
  }

  public setConfigs(configs: CacheConfigs) {
    super.setConfigs(configs);
    this.configs = merge({
      namespace: 'algostack',
      tables: undefined,
      expiration: {
        'default': '1h',
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
      logExpiration: false,
    }, this.configs, configs);
    if (this.stack) this.init(this.stack);
  }


  public init(stack: AlgoStack) {
    super.init(stack);
    const stackVersion = this.stack?.configs?.version || 1;
    let tables: Record<string, string> = {
      [CacheTable.DB_STATE]: '&key',
      ...this.tables,
    };
    // Query module
    if (stack.query) {
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
    if (stack.nfds) {
      tables = { 
        ...tables, 
        [CacheTable.NFD_LOOKUP]: '&address, nfd',
        [CacheTable.NFD_SEARCH]: '&params', 
      };
    }
    // Medias
    if (stack.medias) {
      tables = { 
        ...tables, 
        [CacheTable.MEDIAS_ASSET]: '&id' 
      };
    }
    if (this.configs.tables?.length) {
      const extraStores: Record<string, string> = {} 
      this.configs.tables.forEach(table => {
        if (typeof table === 'string') extraStores[table] = '&params';
        else extraStores[table.name] = table.index || '&params';
      });
      tables = Object.fromEntries(
        Object.entries({ ...extraStores, ...tables })
          .sort(([a],[b]) => a.localeCompare(b))
      );      
    }
    
    this.tables = tables;
    if (this.v > stackVersion) return;
    this.v = stackVersion; 
    
    // Start it!
    this.start();
    return this;
  } 


  /**
  * Start Db
  * ==================================================
  */
  private async start() {
    this.isReady = false;
    let dbVersion = 0;
    try {
      if ( !this.db.isOpen()) await this.db.open()
      dbVersion = this.db.verno;
      this.db.close();
    } catch (e) {
      // console.log(e)
    }
    // console.log('starting attempt')
    if (this.v < dbVersion) return;
    try{
      if (this.db.isOpen()) this.db.close();
      await wait(100);
      this.db.version(this.v).stores(this.tables);
      await this.db.open();
      this.isReady = true;
      // Auto prune
      if (this.configs.pruningInterval) this.autoPrune();
    }
    catch (e) {
      console.log(e)
      this.handleError(e)
    }
  }


  /**
  * Error handler
  * ==================================================
  */
  private async handleError(event: any) {
    const error = event?.reason as DexieError
    const errorNames: string[] = [error?.name];
    if (error?.inner?.name) errorNames.push(error.inner.name);
    const fatal = [
      Dexie.errnames.Upgrade,
      Dexie.errnames.Version,
      Dexie.errnames.Schema,
    ];

    // Db is closed
    const dbIsClosed = errorNames.includes(Dexie.errnames.DatabaseClosed)
    if (dbIsClosed) {
      await this.db.open();
    }

    const shouldClearTables = intersection(errorNames, fatal)?.length
    if (shouldClearTables) {
      console.log('An error occured while upgrading IndexedDB tables.');
      await wait(250);
      await this.start();
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
    this.isReady = false;
    await this.clearAll();
    if (this.db.isOpen()) this.db.close();
    this.db.version(this.v).stores(this.tables); 
    this.db.open();
    this.isReady = true;
  }


  /**
  * Transaction Queue
  * ==================================================
  */
  private commit<T>(scope: TransactionMode, tables: string|string[], txn: () => Promise<T>, frontRun:boolean = false): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!Array.isArray(tables)) tables = [tables];
      if (!this.isReady) {
        if (!frontRun) this.queue.push({scope, tables, txn, resolve});
        else this.queue.unshift({scope, tables, txn, resolve});
        return;
      }
      const isMissingStores = intersection(tables, this.currentTables).length < tables.length;
      if (isMissingStores) {
        this.queue.push({scope, tables, txn, resolve});
        console.warn('Stores are missing', tables);
        return
      }
      return this.runTxn(scope, tables, txn, resolve);    
    })
  }
 
  private runQueue() {
    if (!this.isReady) return;
    while (this.queue.length) {
      const txn = this.queue.shift();
      this.runTxn(txn.scope, txn.tables, txn.txn, txn.resolve);
    }
  }

  private async runTxn<T>(scope: TransactionMode, tables: string|string[], txn: () => Promise<T>, resolve: PromiseResolver) {
    if (!Array.isArray(tables)) tables = [tables];   
    try {
      const results = await this.db.transaction(scope, tables, txn);
      resolve(results);
    } catch (e) {
      console.log('Dexie Txn error', e)
      if (!this.db.isOpen) this.db.open();
      this.queue.push({scope, tables, txn, resolve});
    }
  }


  /**
  * Get a collection bvased on a query
  * ==================================================
  */
  private async getCollection(tableName: string, query: CacheQuery): Promise<Collection|undefined> {
    let table = this.db[tableName];
    if (!table) {
      console.error(`Table not found (${tableName})`);
      return undefined;
    }
    
    if (query.orderBy) table = table.orderBy(query.orderBy);
    if (query.order && ['desc', 'DESC'].includes(query.order)) table = table.desc();
    if (query.where) {
      const where = this.hashObjectProps(query.where);
      if (Object.keys(where).length) {
        table = table.where( this.hashObjectProps(query.where) );
      }
    }
    if (query.filter) table = table.filter( query.filter );
    if (!query.includeExpired) table = table.filter( (entry: CacheEntry) => !this.isExpired(table, entry));
    return table;
  } 


  /**
  * Find an entry based on its ID and the query
  * ==================================================
  */
  public async find<Q extends CacheQuery>(tableName: string, query: Q): Promise<
    Q extends { limit: number }
      ? CacheEntry[]|undefined
      : CacheEntry|undefined
  > {
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
  * Save an entry
  * ==================================================
  */
  public async save(tableName: string, data: any, entry: CacheEntry) {
    // if (!this.db[tableName]) return console.error(`Table not found (${tableName})`);
    entry = {
      ...this.hashObjectProps(entry), 
      data, 
      timestamp: Date.now(),
    }
    return this.commit('rw', tableName, async () => {
      return await this.db[tableName].put(entry)
    })
  }

  public async bulkSave(tableName: string, entries: { data: any, entry: CacheEntry }[] ) {
    if (!entries.length) return;
    const timestamp = Date.now();
    const rows = entries.map(row => ({
        ...this.hashObjectProps(row.entry), 
        data: row.data, 
        timestamp,
      }
    ))
    return this.commit('rw', tableName, async () => {
      return await this.db[tableName].bulkPut(rows)
    });
  }

  /**
  * Delete en entry
  * ==================================================
  */
  public async delete(tableName: string, query: CacheQuery): Promise<number> {
    return this.commit('rw', tableName, async () => {
      const collection = await this.getCollection(tableName, query);
      if (!collection) return 0;
      return collection.delete();
    }) 
  }



  /**
  * Prepare cache entry
  * ==================================================
  */
  private hashObjectProps (entry: CacheEntry = {}) {
    if (typeof entry !== 'object') return entry;
    const result = cloneDeep(entry);
    Object.entries(result)
      .forEach(([key, value]) => {
        if (typeof value === 'object' && !Array.isArray(value))
          return result[key] = objHash(value)
        if (value === null || value === undefined)
          return delete result[key];
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
    if ( isExpired && this.configs.logExpiration) 
      console.warn(`[${tableName}] Cache entry has expired.`)
    return isExpired;
  }

  private getExpiration(tableName: string) {
    const expirationStr = this.configs.expiration[tableName] 
      || this.configs.expiration.default;
    return durationStringToMs(expirationStr);
  }



  /**
  * Pruning
  * ==================================================
  */
  public async prune(tables?: string|string[]) {
    const pruned = {}; 
    if (tables === undefined) tables = this.currentTables;
    else if (typeof tables === 'string') tables = [tables];
    if (this.configs.persist?.length) {
      tables = tables.filter(table => !this.configs.persist.includes(table))
    }
    for (let i=0; i<tables.length; i++) {
      const tableName = tables[i]
      // continue to the next table if it never expires
      if (this.configs.expiration[tableName] === 'never') continue;
      const expirationLimit = Date.now() - this.getExpiration(tableName);
      const expired = await this.commit('rw', tableName, async () => {
        const table = this.db[tableName];
        const expired = await table
          .filter(entry => entry.timestamp < expirationLimit)
          .delete()
        return expired;
      }, true);
      if (expired) pruned[tableName] = expired;
    }
    return pruned;
  }

  private async autoPrune() {
    if (!this.configs.pruningInterval) return;
    const now = Date.now();
    const lastTimestamp = await this.find('db/state', { where: { key: 'prunedAt' } });
    const pruneAfter =  durationStringToMs(this.configs.pruningInterval);
    const nextPruning = (lastTimestamp?.timestamp || 0 ) + pruneAfter;
    if (now < nextPruning) return;

    const pruned = await this.prune();
    await this.save('db/state', null, {key: 'prunedAt'});
    console.warn('Caches pruned: ', pruned);
  }

}

