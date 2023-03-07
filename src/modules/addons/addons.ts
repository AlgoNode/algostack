import type NFDs from '../nfds/index.js';
import type Cache from '../cache/index.js';
import type Query from '../query/index.js';
import type { Payload } from '../query/index.js';
import { Addon } from '../../enums.js';
import AlgoStack from '../../index.js';
import allAddons from './classes/index.js';

//
// QUERY ADDONS class
// ----------------------------------------------
export default class Addons {
  public nfds?: NFDs;
  public cache?: Cache;
  public query?: Query;


  init(forwarded: AlgoStack) {
    this.nfds = forwarded.nfds;
    this.cache = forwarded.cache;
    this.query = forwarded.query;
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
