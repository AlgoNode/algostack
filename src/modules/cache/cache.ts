import Dexie, { DexieError } from 'dexie';
import objHash from 'object-hash';
import AlgoStack from '../../index.js';
import options from '../../utils/options.js';
import { durationStringToMs } from '../../helpers/format.js';
import { CacheEntry } from './types.js';
import { includes, isArray } from 'lodash';

/**
 * Cache module
 * ==================================================
 */
export default class Cache {
  protected db: Dexie;
  protected v: number;

  constructor() {
    this.v = options.version || 1;
    this.db = new Dexie(options.storageNamespace);
  }

  /**
  * Init DB
  * ==================================================
  */
  public init(forwarded: AlgoStack) {
    let stores: Record<string, string> = {}
    // Query module
    if (forwarded.query) {
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
    if (forwarded.nfds) {
      stores = { 
        ...stores, 
        'nfd/lookup': '&address, *nfds',
        'nfd/search': '&params', 
      };
    }
    // Medias
    if (forwarded.medias) {
      stores = { 
        ...stores, 
        'medias/asset': '&id' 
      };
    }

    if (options?.customCaches?.length) {
      const customStores: Record<string, string> = {} 
      options.customCaches.forEach(store => {
        if (typeof store === 'string') customStores[store] = '&params';
        else customStores[store.name] = store.index || '&params';
      });
      stores = {
        ...customStores,
        ...stores,
      }
    }
    
    // Init
    this.db.version(this.v).stores(stores);
    
  }  

  /**
  * Find an entry based on its ID and the query
  * ==================================================
  */
  public async find(store: string, query: CacheEntry): Promise<Record<string,any>|undefined> {
    if (!this.db[store]) {
      console.error(`Store not found (${store})`);
      return;
    }
    query = this.filterCacheEntry(query);
    try {
      const entry = await this.getEntry(store, query);
      if (!entry) return;
      const isExpired = this.isExpired(store, entry);
      if (isExpired) {
        console.warn(`[${store}] Cache entry has expired.`)
        return;
      }
      return entry;
    }
    catch(e) {
      // console.log(store, e)
      return;
    };
  }

  public async getEntry(store: string, query: CacheEntry) {
    if (!this.db[store]) return console.error(`Store not found (${store})`);
    return await this.db[store].get(query) as Record<string, any>;
  }

  public async search(store: string, str: string, keys: string[]) {
    if (!this.db[store]) return console.error(`Store not found (${store})`);
    const includesStr = new RegExp(str, 'i');
    const results = await this.db[store].filter((entry) => (
      Object.entries(entry.data)
        .filter(([key]) => keys.includes(key))
        .some(([, value]) => (
          Array.isArray(value)
            ? value.some(value => typeof value === 'string' && includesStr.test(value))
            : typeof value === 'string' && includesStr.test(value)
        ))
    )).toArray();
    const entries = results.map(entry => entry.data); 
    return entries;
  }


  /**
  * Save an entry
  * ==================================================
  */
  public async save(store: string, data: any, entry: CacheEntry) {
    if (!this.db[store]) return console.error(`Store not found (${store})`);
    entry = {
      ...this.filterCacheEntry(entry), 
      data, 
      timestamp: Date.now(),
    }
    try {
      await this.db[store].put(entry);
    }
    catch(e) {
      await this.handleError(e, store);
    }
  }



  /**
  * Prepare cache entry
  * ==================================================
  */
  private filterCacheEntry (entry: CacheEntry = {}) {
    const result = entry;
    Object.entries(result)
      .forEach(([key, value]) => {
        if (typeof value === 'object' && !Array.isArray(value)) result[key] = objHash(value)
        if (value === null || value === undefined) delete result[key]; 
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
    return isExpired;
  }

  private getExpiration(store: string) {
    const expirationStr = options.cacheExpiration[store] 
      || options.cacheExpiration.default;
    return durationStringToMs(expirationStr);
  }


  /**
  * Error handler
  * ==================================================
  */
  private async handleError(error: DexieError, store?: string) {
    const names: string[] = [error.name];
    if (error.inner?.name) names.push(error.inner.name);

    if (names.includes(Dexie.errnames.Upgrade)) {
      console.warn('An error occured while upgrading IndexedDB tables. Clearing IndexedDB Cache.');
      await this.clearAll();
    }
  }


  /**
  * Reset
  * ==================================================
  */
  private async clearAll() {
    await this.db.delete();
  }
}

