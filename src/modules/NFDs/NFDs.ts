import axios from 'axios';
import uniq from 'lodash/uniq.js';
import AlgoStack from '../../index.js';
import Options from '../../utils/options.js';

/**
 * NFDs module
 * ==================================================
 */
export default class NFDs {
  protected options: Options;

  constructor(forwarded: AlgoStack) {
    this.options = forwarded.options;
  }
  
  /**
   * Get NFD
   * ==================================================
   */
  async getNFDs (address: string) {
    try {
      const response = await axios.get(`${this.options.NFDApiUrl}/nfd/address?address=${address}&limit=1`)
      if (!response.data || !response.data.length) return [];
      return response.data
        .filter(nfd => nfd.depositAccount === address)
        .map(nfd => nfd.name);
    }
    catch (e) {
      return [];
    }
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

