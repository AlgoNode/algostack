import axios from 'axios';
import uniq from 'lodash/uniq.js';
import AlgoStack from '../../index.js';
import Options from '../../utils/options.js';
import type Cache from '../Cache/index.js';

/**
 * NFDs module
 * ==================================================
 */
export default class NFDs {
  protected options: Options;
  protected cache?: Cache;

  constructor(forwarded: AlgoStack) {
    this.options = forwarded.options;
    this.cache = forwarded.cache;
  }
  
  /**
   * Get NFD
   * ==================================================
   */
  async getNFDs (address: string) {
    
    if (this.cache) {
      const cached = await this.cache.find('nfds', { address });
      if (cached?.nfds) return cached.nfds;
    }

    let results = [];
    try {
      const response = await axios.get(`${this.options.NFDApiUrl}/nfd/address?address=${address}&limit=1`)
      if (response?.data?.length) results = response.data
    } catch {}

    const nfds = results
      .filter(nfd => nfd.depositAccount === address)
      .map(nfd => nfd.name);

    if (this.cache) {
      await this.cache.save('nfds', results, { address, nfds });
    }

    return nfds;
  
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

}

