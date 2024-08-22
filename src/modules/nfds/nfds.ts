import type Cache from '../cache/index';
import type AlgoStack from '../../index';
import axios from 'axios';
import throttle from 'lodash-es/throttle.js';
import chunk from 'lodash-es/chunk.js';
import { NFDConfigs, NFDProps, NFDQueryCallback } from './types.js';
import { isAddress, isDomain } from '../../helpers/strings.js';
import { QueryParams } from '../query/types.js';
import { BaseModule } from '../_baseModule.js';
import merge from 'lodash-es/merge.js';
import { CacheTable } from '../cache/index.js';


/**
* NFDs module
* ==================================================
*/
export default class NFDs extends BaseModule{
  private configs: NFDConfigs = {};
  protected cache?: Cache;
  protected lookupQueue: Record<string, NFDQueryCallback[]>;
  protected whoisQueue: Record<string, NFDQueryCallback[]>;

  constructor(configs: NFDConfigs = {}) {
    super();
    this.lookupQueue = {};
    this.whoisQueue = {};
    this.setConfigs(configs);
  }
  
  public setConfigs(configs: NFDConfigs) {
    this.configs = merge({
      nfdApiUrl: 'https://api.nf.domains',
    }, this.configs, configs);
  }

  public init(stack: AlgoStack) {
    super.init(stack);
    this.cache = stack.cache;
    return this;
  }


  /**
  * LOOKUPS 
  * Get NFDs for a given address (batched lookup)
  * ==================================================
  */
  public async lookup <T extends boolean|undefined>(address: string, full?: T, refreshCache?:boolean): Promise<(T extends true ? NFDProps : string)|undefined> {
    return new Promise(async resolve => {
      if (!this.initiated) await this.waitForInit();

      if (!isAddress(address)) return resolve(undefined);
      // get cache
      if (this.cache && !refreshCache) {
        const cached = await this.cache.find(CacheTable.NFD_LOOKUP, { where: { address }});
        if (cached) return resolve(full ? cached.data : cached.nfd);
      }
      // check if a task is currently fetching this address
      if (!this.lookupQueue[address]) this.lookupQueue[address] = [];  
      this.lookupQueue[address].push({ full, resolve });
      // trigger throttled fetch
      this.batchLookups();
    })
  }

  // Legacy method
  public async getNFDs <T extends boolean|undefined>(address: string, full?: T): Promise<(T extends true ? NFDProps : string)[] > {
    return new Promise(async resolve => {
      if (!this.initiated) await this.waitForInit();
      const result = await this.lookup(address, full);
      resolve(result ? [result] : []);
    })
  }

  // Run lookup batches
  private batchLookups = throttle( async () => {
    const queue: string[] = Object.keys(this.lookupQueue)
    const batches: string[][] = chunk(queue, 20);
    batches.forEach( async addresses => {
      let results: Record<string, NFDProps> = {}; 
      const addressesQueryString = `address=${addresses.join('&address=')}`;
      try {
        const response = await axios.get(`${this.configs.nfdApiUrl}/nfd/lookup?${addressesQueryString}`, { 
          params: { 
            view: 'full',
            // t: Date.now(),
          },
        });
        if (response?.data) results = response.data
      } catch {}
      // loop each address in batch to map it with results
      addresses.forEach( async address => {
        let nfd = results[address];
        nfd = this.prepareResult(results[address])
        // trigger current stack
        if (this.lookupQueue[address]?.length) {
          this.lookupQueue[address].forEach(({full, resolve}) => resolve(full ? nfd : nfd?.name));
          delete this.lookupQueue[address];
        }
        // save cache
        if (this.cache) {
          await this.cache.save(CacheTable.NFD_LOOKUP, nfd, { address, nfd: nfd?.name });
        }
      });
    });  
  }, 200);



  /**
  * WHOIS
  * Reverse lookups
  * ==================================================
  */


  public async whois (name: string): Promise<NFDProps|undefined> {
    return new Promise(async resolve => {
      if (!this.initiated) await this.waitForInit();

      if (!isDomain(name)) return resolve(undefined);
      // get cache
      if (this.cache) {
        const cached = await this.cache.find(CacheTable.NFD_LOOKUP, { where: { nfd: name }});
        if (cached) return resolve(cached.data);
      }
      // check if a task is currently fetching this address
      if (!this.whoisQueue[name]) this.whoisQueue[name] = [];  
      this.whoisQueue[name].push({ resolve });
      // trigger throttled fetch
      this.batchWhois();
    });
  }

  // Legacy methods
  public async getNFD (nfd: string): Promise<NFDProps|undefined> {
    return this.whois(nfd);
  }
  public async getAddress (name: string): Promise<string|undefined> {
    return new Promise(async resolve => {
      const nfd = await this.whois(name);
      resolve(nfd?.depositAccount);
    })
  }

  // batch whois
  private batchWhois = throttle( async () => {
    const queue: string[] = Object.keys(this.whoisQueue)
    queue.forEach( async (name) => {
      let nfd: NFDProps|undefined; 
      try {
        const { data } = await axios.get(`${this.configs.nfdApiUrl}/nfd/${name.toLocaleLowerCase()}`, { 
          params: { view: 'full' }
        });
        nfd = this.prepareResult(data)
      } catch {}

      // trigger current stack
      if (this.whoisQueue[name]?.length) {
        this.whoisQueue[name].forEach(({ resolve }) => resolve( nfd ));
        delete this.whoisQueue[name];
      }
    });  
  }, 200);
  


  /**
  * Search
  * ==================================================
  */
  public async search(str: string, originalParams: QueryParams): Promise<NFDProps[]> {
    if (!this.initiated) await this.waitForInit();

    const params = { ...originalParams };
    if ( params.refreshCache !== undefined ) delete params.refreshCache;
    if ( params.noCache !== undefined ) delete params.noCache;
    params.substring = str;
    params.view = 'full';
    
    // get cache
    if (this.cache && !originalParams.refreshCache && !originalParams.noCache) {
      const cached = await this.cache.find(CacheTable.NFD_SEARCH, { where: { params }});
      if (cached) return cached.data;
    }

    let results = [];
    try {
      const response = await axios.get(`${this.configs.nfdApiUrl}/nfd/v2/search`, {
        params: { 
          ...params,
          substring: str, 
          view: 'full',
        }
      })
      const nfds = response.data?.nfds;
      if (nfds.length) {
        results = nfds.map(this.prepareResult.bind(this));
      }
    } catch {}

    // save cache
    if (this.cache && !originalParams.noCache) {
      await this.cache.save(CacheTable.NFD_SEARCH, results, { params });
    }

    return results;
  }


  /**
  * Helpers
  * ==================================================
  */
  private prepareResult(nfd?: NFDProps) {
    if (!nfd) return undefined
    // add score
    nfd.score = this.getNFDScore(nfd);
    // verified doesnt get cleared up 
    // so if both are there, take userdefined
    if (nfd.properties.verified) 
      nfd.avatar = nfd.properties?.userDefined?.avatar || nfd.properties.verified?.avatar;  
    else 
      nfd.avatar = nfd.properties?.userDefined?.avatar;
    return nfd;
  }

  private getNFDScore(nfd: NFDProps) {
    let score = 0;
    const { properties: props } = nfd
    if (!props) return score;
    ['avatar', 'domain', 'email', 'twitter', 'discord'].forEach(contact => {
      if (props?.verified?.[contact]) score += 1.75;
      if (props?.userDefined?.[contact]) score += 1;
    })
    return score;
  }
  
}

