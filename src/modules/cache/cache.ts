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
  private stores: Record<string,string> = {};
  private queue: IdbTxn<any>[] = [];
  private get currentStores() { return this.db?.tables.map(table => table.name) || [] };
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
      stores: undefined,
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
    let stores: Record<string, string> = {
      [CacheTable.DB_STATE]: '&key',
      ...this.stores,
    };
    // Query module
    if (stack.query) {
      stores = { 
        ...stores, 
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
      stores = { 
        ...stores, 
        [CacheTable.NFD_LOOKUP]: '&address, nfd',
        [CacheTable.NFD_SEARCH]: '&params', 
      };
    }
    // Medias
    if (stack.medias) {
      stores = { 
        ...stores, 
        [CacheTable.MEDIAS_ASSET]: '&id' 
      };
    }
    if (this.configs.stores?.length) {
      const extraStores: Record<string, string> = {} 
      this.configs.stores.forEach(store => {
        if (typeof store === 'string') extraStores[store] = '&params';
        else extraStores[store.name] = store.index || '&params';
      });
      stores = Object.fromEntries(
        Object.entries({ ...extraStores, ...stores })
          .sort(([a],[b]) => a.localeCompare(b))
      );      
    }
    
    this.stores = stores;
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
      this.db.version(this.v).stores(this.stores);
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
    this.db.version(this.v).stores(this.stores); 
    this.db.open();
    this.isReady = true;
  }


  /**
  * Transaction Queue
  * ==================================================
  */
  private commit<T>(scope: TransactionMode, stores: string|string[], txn: () => Promise<T>, frontRun:boolean = false): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!Array.isArray(stores)) stores = [stores];
      if (!this.isReady) {
        if (!frontRun) this.queue.push({scope, stores, txn, resolve});
        else this.queue.unshift({scope, stores, txn, resolve});
        return;
      }
      const isMissingStores = intersection(stores, this.currentStores).length < stores.length;
      if (isMissingStores) {
        this.queue.push({scope, stores, txn, resolve});
        console.warn('Stores are missing', stores);
        return
      }
      return this.runTxn(scope, stores, txn, resolve);    
    })
  }
 
  private runQueue() {
    if (!this.isReady) return;
    while (this.queue.length) {
      const txn = this.queue.shift();
      this.runTxn(txn.scope, txn.stores, txn.txn, txn.resolve);
    }
  }

  private async runTxn<T>(scope: TransactionMode, stores: string|string[], txn: () => Promise<T>, resolve: PromiseResolver) {
    if (!Array.isArray(stores)) stores = [stores];   
    try {
      const results = await this.db.transaction(scope, stores, txn);
      resolve(results);
    } catch (e) {
      console.log('Dexie Txn error', e)
      if (!this.db.isOpen) this.db.open();
      this.queue.push({scope, stores, txn, resolve});
    }
  }


  /**
  * Get a collection bvased on a query
  * ==================================================
  */
  private async getCollection(store: string, query: CacheQuery): Promise<Collection|undefined> {
    let table = this.db[store];
    if (!table) {
      console.error(`Store not found (${store})`);
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
    if (!query.includeExpired) table = table.filter( (entry: CacheEntry) => !this.isExpired(store, entry));
    return table;
  } 


  /**
  * Find an entry based on its ID and the query
  * ==================================================
  */
  public async find<Q extends CacheQuery>(store: string, query: Q): Promise<
    Q extends { limit: number }
      ? CacheEntry[]|undefined
      : CacheEntry|undefined
  > {
    return this.commit('r', store, async () => {
      const collection = await this.getCollection(store, query);
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
  public async save(store: string, data: any, entry: CacheEntry) {
    // if (!this.db[store]) return console.error(`Store not found (${store})`);
    entry = {
      ...this.hashObjectProps(entry), 
      data, 
      timestamp: Date.now(),
    }
    return this.commit('rw', store, async () => {
      return await this.db[store].put(entry)
    })
  }

  public async bulkSave(store: string, entries: { data: any, entry: CacheEntry }[] ) {
    if (!entries.length) return;
    const timestamp = Date.now();
    const rows = entries.map(row => ({
        ...this.hashObjectProps(row.entry), 
        data: row.data, 
        timestamp,
      }
    ))
    return this.commit('rw', store, async () => {
      return await this.db[store].bulkPut(rows)
    });
  }

  /**
  * Delete en entry
  * ==================================================
  */
  public async delete(store: string, query: CacheQuery): Promise<number> {
    return this.commit('rw', store, async () => {
      const collection = await this.getCollection(store, query);
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
  public isExpired(store: string, entry: CacheEntry) {
    if (this.configs.expiration[store] === 'never') return false;
    const expiration = this.getExpiration(store);
    const isExpired = entry.timestamp + expiration < Date.now();
    if ( isExpired && this.configs.logExpiration) 
      console.warn(`[${store}] Cache entry has expired.`)
    return isExpired;
  }

  private getExpiration(store: string) {
    const expirationStr = this.configs.expiration[store] 
      || this.configs.expiration.default;
    return durationStringToMs(expirationStr);
  }



  /**
  * Pruning
  * ==================================================
  */
  public async prune(stores?: string|string[]) {
    const pruned = {}; 
    if (stores === undefined) stores = this.currentStores;
    else if (typeof stores === 'string') stores = [stores];
    if (this.configs.persist?.length) {
      stores = stores.filter(store => !this.configs.persist.includes(store))
    }
    for (let i=0; i<stores.length; i++) {
      const store = stores[i]
      // continue to the next store if it never expires
      if (this.configs.expiration[store] === 'never') continue;
      const expirationLimit = Date.now() - this.getExpiration(store);
      const expired = await this.commit('rw', store, async () => {
        const table = this.db[store];
        const expired = await table
          .filter(entry => entry.timestamp < expirationLimit)
          .delete()
        return expired;
      }, true);
      if (expired) pruned[store] = expired;
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

