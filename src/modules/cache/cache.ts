import { durationStringToMs } from '../../helpers/format.js';
import { CacheConfigs, CacheEntry, CacheQuery, IdbTxn } from './types.js';
import { BaseModule } from '../_baseModule.js';
import { indexedDB, IDBKeyRange } from "fake-indexeddb";
import Dexie, { Collection, DexieError, DexieEvent, GlobalDexieEvents, TransactionMode, Version } from 'dexie';
import objHash from 'object-hash';
import AlgoStack from '../../index.js';
import merge from 'lodash-es/merge.js';
import intersection from 'lodash-es/intersection.js';


/**
 * Cache module
 * ==================================================
 */
export default class Cache extends BaseModule {
  protected db: Dexie;
  protected v: number = 1;
  protected configs: CacheConfigs;
  protected stores: Record<string,string> = {};
  protected queue: IdbTxn<any>[] = [];
  protected get currentStores() { return this.db?.tables.map(table => table.name) || [] };
  protected _isReady: boolean = false;
  protected get isReady() { return this._isReady };
  protected set isReady(value: boolean) {
    this._isReady = value;
    if (value === true) this.runQueue();
  }

  constructor(configs: CacheConfigs = {}) {
    super();
    this.db = new Dexie(
      configs.namespace, 
      typeof window !== 'undefined' && window.indexedDB 
        ? undefined
        : { indexedDB, IDBKeyRange }
      );
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', this.handleError.bind(this))
    }
    this.setConfigs(configs);
  }

  public setConfigs(configs: CacheConfigs) {
    super.setConfigs(configs);
    this.v = this.stack?.configs?.version || 1; 
    this.configs = merge({
      namespace: 'algostack',
      stores: undefined,
      logExpiration: false,
      expiration: {
        'default': '1h',
        'indexer/asset': '1w',
        'indexer/assetBalances': '2s',
        'indexer/assetTransactions': '2s',
        'indexer/assets': '5m',
        'indexer/block': '1w',
        'indexer/transaction': '1w',
        'node/account': '10s',
        'node/teal': '6h',
        'nfd/lookup': '1h',
        'nfd/search': '1m',
        'medias/asset': '1d',
      },
    }, configs);
    if (this.stack) this.init(this.stack);
  }


  public init(stack: AlgoStack) {
    super.init(stack);
    let stores: Record<string, string> = {}
    // Query module
    if (stack.query) {
      stores = { 
        ...stores, 
        // indexer
        'indexer/account': '&params',
        'indexer/accountAssets': '&params',
        'indexer/accountApplications': '&params',
        'indexer/accountTransactions': '&params',
        'indexer/application': '&params',
        'indexer/applicationBox': '&params',
        'indexer/applicationBoxes': '&params',
        'indexer/asset': '&params',
        'indexer/assetBalances': '&params',
        'indexer/assetTransactions': '&params',
        'indexer/block': '&params',
        'indexer/txn': '&params',

        // node
        'node/account': '&params',
        'node/accountApplication': '&params',
        'node/accountAsset': '&params',
        'node/block': '&params',
        'node/blockProof': '&params',
        'node/blockTransactionProof': '&params',
        'node/teal': '&params',

        // search
        'indexer/applications': '&params',
        'indexer/accounts': '&params',
        'indexer/assets': '&params',
        'indexer/txns': '&params',
      };
    }
    // NFDs
    if (stack.nfds) {
      stores = { 
        ...stores, 
        'nfd/lookup': '&address, nfd',
        'nfd/search': '&params', 
      };
    }
    // Medias
    if (stack.medias) {
      stores = { 
        ...stores, 
        'medias/asset': '&id' 
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
    
    
    // Init
    this.stores = stores;
    try {
      this.isReady = false;
      if (this.db.isOpen()) this.db.close();
      this.db.version(this.v).stores(this.stores);
      this.isReady = true;
    }
    catch (e) {
      this.resetDb();
    }
    return this;
  }  

  /**
  * Transaction Queue
  * ==================================================
  */
  private async commit<T>(scope: TransactionMode, stores: string|string[], fn: () => Promise<T>): Promise<T> {
    if (!Array.isArray(stores)) stores = [stores];
    if (!this.isReady) {
      this.queue.push({scope, stores, fn});
      return;
    }
    const isMissingStores = intersection(stores, this.currentStores).length < stores.length;
    if (isMissingStores) {
      this.queue.push({scope, stores, fn});
      console.warn('Stores are missing', stores);
      return
    }
    try {
      const results = await this.db.transaction(scope, stores, fn);
      return results;
    } catch (e) {
      if (!this.db.isOpen) this.db.open();
      this.queue.push({scope, stores, fn});
      return
    }
  }
 
  private runQueue() {
    if (!this.isReady) return;
    while (this.queue.length) {
      const txn = this.queue.shift();
      this.commit(txn.scope, txn.stores, txn.fn);
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
    if (!this.db[store]) return console.error(`Store not found (${store})`);
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
    if (!this.db[store]) return console.error(`Store not found (${store})`);
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
    const result = entry;
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
  * Error handler
  * ==================================================
  */
  private async handleError(event: any) {
    const error = event.reason as DexieError
    const errorNames: string[] = [error.name];
    if (error.inner?.name) errorNames.push(error.inner.name);
    const fatal = [
      Dexie.errnames.Upgrade,
      Dexie.errnames.Version,
      Dexie.errnames.Schema,
    ];
    const dbIsClosed = errorNames.includes(Dexie.errnames.DatabaseClosed)
    if (dbIsClosed) this.db.open();

    const shouldClearTables = intersection(errorNames, fatal)?.length
    if (shouldClearTables) {
      // console.warn('An error occured while upgrading IndexedDB tables. Clearing IndexedDB Cache.');
      await this.resetDb();
      // if (typeof window.location !== 'undefined') window.location.reload();
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
  * Prune
  * ==================================================
  */
  public async prune(stores?: string|string[]) {
    const pruned = {}; 
    if (stores === undefined) stores = this.currentStores;
    else if (typeof stores === 'string') stores = [stores];
    for (let i=0; i<stores.length; i++) {
      const store = stores[i]
      const expirationLimit = Date.now() - this.getExpiration(store);
      const expired = await this.commit('rw', store, async () => {
        const table = this.db[store];
        const expired = await table
          .filter(entry => entry.timestamp < expirationLimit)
          .delete()
        return expired;
      });
      if (expired) pruned[store] = expired;
    }
    return pruned;
  }

}

