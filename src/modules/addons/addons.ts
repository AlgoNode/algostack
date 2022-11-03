import AlgoStack from '../../index.js';
import Options from '../../utils/options.js';
import type NFDs from '../nfds/index.js';
import type Cache from '../cache/index.js';
import type { Payload } from '../query/index.js';
import allAddons from './classes/index.js';
import { Addon } from './enums.js';

//
// QUERY ADDONS class
// ----------------------------------------------
export default class Addons {
  protected options: Options;
  public nfds?: NFDs;
  public cache?: Cache;
  constructor(forwarded: AlgoStack) {
    this.options = forwarded.options;
    this.nfds = forwarded.nfds;
    this.cache = forwarded.cache;
  }



  /**
   * Check for addons
   * ==================================================
   */
  public async apply(data: Payload, requestedAddons: Addon[]) {
    for (let i=0; i<requestedAddons.length; i++) {
      if (!allAddons[requestedAddons[i]]) continue;
      const addon = new allAddons[requestedAddons[i]](data, this);
      await addon.run();
    }
    return data;
  }
  
}
