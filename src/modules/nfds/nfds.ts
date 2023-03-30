import axios from 'axios';
import throttle from 'lodash/throttle.js';
import chunk from 'lodash/chunk.js';
import AlgoStack from '../../index.js';
import options from '../../utils/options.js';
import type Cache from '../cache/index.js';
import { NFDProps, NFDQueryCallback } from './types.js';
import { isAddress } from '../../helpers/strings.js';

/**
* NFDs module
* ==================================================
*/
export default class NFDs {
  protected cache?: Cache;
  protected fetching: Record<string, NFDQueryCallback[]>;

  constructor(forwarded: AlgoStack) {
    this.cache = forwarded.cache;
    this.fetching = {};
  }
  

  /**
  * Get a single NFD data
  * ==================================================
  */
  async getNFD (nfd: string): Promise<NFDProps|undefined> {
    // TODO : add cache
    if (!nfd) return undefined;
    try {
      const { data } = await axios.get(`${options.nfdApiUrl}/nfd/${nfd.toLocaleLowerCase()}`, { 
        params: { view: 'full' }
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
  async getNFDs <T extends boolean|undefined>(address: string, full?: T): Promise<T extends true ? NFDProps[] : string[] > {
    return new Promise(async resolve => {
      if (!isAddress(address)) return resolve([]);
      // get cache
      if (this.cache) {
        const cached = await this.cache.find('nfd/lookup', { address });
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
    const fetching: string[] = Object.keys(this.fetching)
    const batches = chunk(fetching, 20);
    batches.forEach( async addresses => {
      let results: Record<string, NFDProps[]> = {}; 
      const addressesQueryString = `address=${addresses.join('&address=')}`;
      try {
        const response = await axios.get(`${options.nfdApiUrl}/nfd/v2/address?${addressesQueryString}`, { 
          params: { view: 'full' }
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
          await this.cache.save('nfd/lookup', verified, { address, nfds: domains });
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
        const cached = await this.cache.find('nfd/lookup', { nfds: domain });
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
      // TODO : find a way to save a single nfd and maybe add more later
      // if (this.cache && address) {
      //   await this.cache.save('nfd/lookup', results, { address, nfds: domain });
      // }

      // resolve 
      resolve(address);
    })
  }


  /**
  * Search
  * ==================================================
  */
  async search(prompt: string, params: {}): Promise<NFDProps[]> {
    // get cache
    if (this.cache) {
      const cached = await this.cache.find('nfd/search', { prompt });
      if (cached) return cached.data;
    }

    let results = [];
    try {
      const response = await axios.get(`${options.nfdApiUrl}/nfd`, {
        params: { 
          ...params,
          substring: prompt, 
          view: 'full',
        }
      })
      const data = response.data;
      if (data.length) {
        results = this.prepareResults(
          data.filter(nfd => nfd.state !== 'forSale')
        );
      }
    } catch {}

    // save cache
    if (this.cache) {
      await this.cache.save('nfd/search', results, { prompt });
    }


    return results;
  }


  /**
  * Helpers
  * ==================================================
  */
  private prepareResults(nfds: NFDProps[], address?: string) {
    if (address) {
      nfds = nfds.filter(nfd => (
        nfd?.depositAccount === address
        || nfd?.caAlgo?.includes(address)
      ));
    }
    // add scores
    nfds.forEach(nfd => nfd.score = this.getNFDScore(nfd, address));
    // sort by avatar
    nfds.sort((a, b) => ((b.score||0) - (a.score||0)));
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

  private getNFDScore(nfd: NFDProps, address?: string) {
    let score = 0;
    const { properties: props } = nfd
    if (address && address === nfd.depositAccount) score += 5;
    if (!props) return score;
    ['avatar', 'domain', 'email', 'twitter', 'discord'].forEach(contact => {
      if (props?.verified?.[contact]) score += 1.75;
      if (props?.userDefined?.[contact]) score += 1;
    })
    return score;
  }
  


}

