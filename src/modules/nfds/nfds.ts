import axios from 'axios';
import uniq from 'lodash/uniq.js';
import throttle from 'lodash/throttle.js';
import chunk from 'lodash/chunk.js';
import AlgoStack from '../../index.js';
import options from '../../utils/options.js';
import type Cache from '../cache/index.js';
import { AddressString, NFDQueryCallback, NFDQuery } from './types.js';

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
   * Get NFD
   * ==================================================
   */
 
  
  async getNFDs <T extends boolean|undefined>(address: string, full?: T): Promise<T extends true ? Record<string,any>[] : string[] > {
    return new Promise(async resolve => {
      // get cache
      if (this.cache) {
        const cached = await this.cache.find('nfds', { address });
        if (cached) return resolve(full ? cached.data : cached.nfds);
      }
      // check if a task is currently fetching this address
      if (!this.fetching[address]) this.fetching[address] = [];  
      this.fetching[address].push(resolve);

      // trigger throttled fetch
      this.batchFetchNFDs(full);
    })
  
  }


  /**
  * Fetch address batch
  * ==================================================
  */
  private batchFetchNFDs = throttle( async (full: boolean = false) => {
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
      } 
      catch {}

      // loop each address in batch to map it with results
      addresses.forEach( async address => {
        const result = results[address] || [];
        const verified = result.filter(nfd => nfd.depositAccount === address) 
        const nfds = verified.map(nfd => nfd.name);
        // trigger current stack
        if (this.fetching[address]?.length) {
          this.fetching[address].forEach(resolve => resolve(full ? verified : nfds));
          delete this.fetching[address];
        }
        // save cache
        if (this.cache) {
          await this.cache.save('nfds', verified, { address, nfds });
        }
      });
    });  
  }, 200);

  
  /**
   * Map each prop of an object { key: address } 
   * with their relative domains
   * ==================================================
   */
  async map (addressMap: Record<string, string|undefined>) {
    const mappedAddresses = {};
    const mappedNFDs = {};
    Object.entries(addressMap)
      .forEach(([key, addr]) => {
        if (!addr) return;
        if (!mappedAddresses[addr]) mappedAddresses[addr] = [];
        mappedAddresses[addr].push(key);
        mappedNFDs[key] = undefined;
      });

    const addressArr = Object.values(addressMap)
      .filter(address => address !== 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ');
    const uniqueAddresses = uniq(addressArr);
    const queryStr = uniqueAddresses.map(addr => `address=${addr}`).join('&');
    
    try {
      const response = await axios.get(`${options.nfdApiUrl}/nfd/address?${queryStr}&limit=1`);
      if (!response.data || !response.data.length) return {};
      response.data.forEach((nfd: Record<string, any>) => {
        if (!nfd.depositAccount || !mappedAddresses[nfd.depositAccount]) return;
        mappedAddresses[nfd.depositAccount].forEach((addr: string) => {
          mappedNFDs[addr] = nfd.name;
        });   
      });
      return mappedNFDs;
    }
    catch (e) {
      return mappedNFDs;
    }
  }


  /**
   * Get Address
   * ==================================================
   */
  async getAddress (nfds: string): Promise<string|undefined> {
    return new Promise(async resolve => {
      // get cache
      if (this.cache) {
        const cached = await this.cache.find('nfds', { nfds });
        if (cached?.address) return resolve(cached.address);
      }
  
      // check if a task is currently fetching this address
      if (this.fetching[nfds]) {
        this.fetching[nfds].push(resolve);
        return;
      }

      // get results
      let results = [];
      this.fetching[nfds] = [];  
      try {
        const response = await axios.get(`${options.nfdApiUrl}/nfd/${nfds}`)
        if (response?.data) results = [response.data]
      } catch {}

      const address = results[0]?.depositAccount;
      // trigger current stack
      if (this.fetching[nfds]?.length) {
        this.fetching[nfds].forEach(resolve => resolve(address));
        delete this.fetching[nfds];
      }
  
      // save cache
      if (this.cache && address) {
        await this.cache.save('nfds', results, { address, nfds });
      }

      // resolve 
      resolve(address);
    })
  
  }

}

