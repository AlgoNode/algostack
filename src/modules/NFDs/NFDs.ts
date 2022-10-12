import axios from 'axios';
import uniq from 'lodash/uniq.js';
import AlgoStack from '../../index.js';
import Options from '../../utils/options.js';
import type Cache from '../Cache/index.js';
import { AddressString } from './types.js';

/**
 * NFDs module
 * ==================================================
 */
export default class NFDs {
  protected options: Options;
  protected cache?: Cache;
  protected fetching: Record<AddressString, ((PromiseLike) => void)[]>;

  constructor(forwarded: AlgoStack) {
    this.options = forwarded.options;
    this.cache = forwarded.cache;
    this.fetching = {};
  }
  
  /**
   * Get NFD
   * ==================================================
   */
  async getNFDs (address: string): Promise<string[]> {
    return new Promise(async resolve => {
      // get cache
      if (this.cache) {
        const cached = await this.cache.find('nfds', { address });
        if (cached?.nfds) return resolve(cached.nfds);
      }
  
      // check if a task is currently fetching this address
      if (this.fetching[address]) {
        this.fetching[address].push(resolve);
        return;
      }

      // get results
      let results = [];
      this.fetching[address] = [];  
      try {
        const response = await axios.get(`${this.options.NFDApiUrl}/nfd/address?address=${address}&limit=1`)
        if (response?.data?.length) results = response.data
      } catch {}
      const nfds = results
        .filter(nfd => nfd.depositAccount === address)
        .map(nfd => nfd.name);
      
      // trigger current stack
      if (this.fetching[address]?.length) {
        this.fetching[address].forEach(resolve => resolve(nfds));
        delete this.fetching[address];
      }
  
      // save cache
      if (this.cache) {
        await this.cache.save('nfds', results, { address, nfds });
      }

      // resolve 
      resolve(nfds);
    })
  
  }

  
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
      const response = await axios.get(`${this.options.NFDApiUrl}/nfd/address?${queryStr}&limit=1`);
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
        const response = await axios.get(`${this.options.NFDApiUrl}/nfd/${nfds}`)
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

