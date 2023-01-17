import axios from 'axios';
import uniq from 'lodash/uniq.js';
import throttle from 'lodash/throttle.js';
import chunk from 'lodash/chunk.js';
import AlgoStack from '../../index.js';
import options from '../../utils/options.js';
import type Cache from '../cache/index.js';
import { AddressString, NFDQueryCallback, NFDQuery } from './types.js';
import { isAddress } from '../../helpers/strings.js';

/**
* NFDs module
* ==================================================
*/
export default class NFDs {
  protected cache?: Cache;
  protected fetching: Record<AddressString, NFDQueryCallback[]>;

  constructor(forwarded: AlgoStack) {
    this.cache = forwarded.cache;
    this.fetching = {};
  }
  

  /**
  * Get a single NFD data
  * ==================================================
  */
  async getNFD (nfd: string): Promise<Record<string,any>|undefined> {
    if (!nfd) return undefined;
    try {
      const { data } = await axios.get(`${options.nfdApiUrl}/nfd/${nfd.toLocaleLowerCase()}`, { 
        params: { view: 'brief' }
      });
      if (!data) return undefined;
      const result = this.prepareResults([data]);
      return result[0];
    } catch {
      return undefined
    } 
  }


  /**
  * Get NFDs for a given address (batched lookup)
  * ==================================================
  */
  async getNFDs <T extends boolean|undefined>(address: string, full?: T): Promise<T extends true ? Record<string,any>[] : string[] > {
    return new Promise(async resolve => {
      if (!isAddress(address)) return resolve([]);
      // get cache
      if (this.cache) {
        const cached = await this.cache.find('nfds', { address });
        if (cached) return resolve(full ? cached.data : cached.nfds);
      }
      // check if a task is currently fetching this address
      if (!this.fetching[address]) this.fetching[address] = [];  
      this.fetching[address].push({ full, resolve });

      // trigger throttled fetch
      this.batchFetchNFDs();
    })
  }


  /**
  * Fetch address batch
  * ==================================================
  */
  private batchFetchNFDs = throttle( async () => {
    const fetching: AddressString[] = Object.keys(this.fetching)
    const batches = chunk(fetching, 20);
    batches.forEach( async addresses => {
      let results: Record<string, Record<string,any>[]> = {}; 
      const addressesQueryString = `address=${addresses.join('&address=')}`;
      try {
        const response = await axios.get(`${options.nfdApiUrl}/nfd/v2/address?${addressesQueryString}`, { 
          params: { view: 'thumbnail' }
        });
        if (response?.data) results = response.data
      } catch {}
      // loop each address in batch to map it with results
      addresses.forEach( async address => {
        const verified = this.prepareResults(results[address] || [], address)
        // map domains only
        const domains = verified.map(nfd => nfd.name);
        // trigger current stack
        if (this.fetching[address]?.length) {
          this.fetching[address].forEach(({full, resolve}) => resolve(full ? verified : domains));
          delete this.fetching[address];
        }
        // save cache
        if (this.cache) {
          await this.cache.save('nfds', verified, { address, nfds: domains });
        }
      });
    });  
  }, 200);



  /**
  * Get Address
  * ==================================================
  */
  async getAddress (domain: string): Promise<string|undefined> {
    return new Promise(async resolve => {
      // get cache
      if (this.cache) {
        const cached = await this.cache.find('nfds', { nfds: domain });
        if (cached?.address) return resolve(cached.address);
      }
  
      // check if a task is currently fetching this address
      if (this.fetching[domain]) {
        this.fetching[domain].push({ resolve, full: false });
        return;
      }

      // get results
      let results = [];
      this.fetching[domain] = [];  
      try {
        const response = await axios.get(`${options.nfdApiUrl}/nfd/${domain}`);
        if (response?.data) results = [response.data]
      } catch {}
      
      const address = results[0]?.depositAccount;

      // trigger current stack
      if (this.fetching[domain]) {
        this.fetching[domain].forEach(({ resolve }) => resolve(address));
        delete this.fetching[domain];
      }
  
      // save cache
      if (this.cache && address) {
        await this.cache.save('nfds', results, { address, nfds: domain });
      }

      // resolve 
      resolve(address);
    })
  }


  /**
  * Search
  * ==================================================
  */
  async search(prompt: string): Promise<Record<string, any>[]> {
    // get cache
    if (this.cache) {
      const cached = await this.cache.find('nfdSearch', { prompt });
      if (cached) return cached.data;
    }

    let results = [];
    try {
      const { data } = await axios.get(`${options.nfdApiUrl}/nfd`, {
        params: { 
          substring: prompt, 
          view: 'thumbnail',
        }
      })
      if (data.length) {
        results = this.prepareResults(
          data.filter(nfd => nfd.state !== 'forSale')
        );
      }
    } catch {}

    // save cache
    if (this.cache) {
      await this.cache.save('nfdSearch', results, { prompt });
    }


    return results;
  }


  /**
  * Helpers
  * ==================================================
  */
  private prepareResults(nfds: Record<string, any>[], address?: string) {
    if (address) {
      nfds = nfds.filter(nfd => (
        nfd.depositAccount === address
        || nfd.caAlgo.includes(address)
      ));
    }
    // sort by avatar
    nfds.sort((a, b) => { 
      let aW = 0; 
      let bW = 0;
      if (address && address === a.depositAccount) aW = 3; 
      else if (a.properties?.verified?.avatar) aW = 2;
      else if (a.properties?.userDefined?.avatar) aW = 1;
      if (address && address === b.depositAccount) bW = 3; 
      else if (b.properties?.userDefined?.avatar) bW = 1;
      return bW - aW;
    });
    // add avatars
    nfds.forEach(nfd => {
      if (!nfd.properties) return;
      if (nfd.properties.verified) {
        // verified doesnt get cleared up 
        // so if both are there, take userdefined
        nfd.avatar = nfd.properties?.userDefined?.avatar || nfd.properties.verified?.avatar;  
        return;
      }
      nfd.avatar = nfd.properties?.userDefined?.avatar;
    });
    return nfds;
  }
  


}

