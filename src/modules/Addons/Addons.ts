import AlgoStack from '../../index.js';
import Options from '../../utils/options.js';
import type { IndexerResponse } from '../Query/index.js';
import methods from './methods/index.js';

//
// QUERY ADDONS class
// ----------------------------------------------
export default class Addons {
  protected options: Options;
  constructor(forwarded: AlgoStack) {
    this.options = forwarded.options;
  }



  /**
   * Check for addon
   * ==================================================
   */
  public async applyOn(data: IndexerResponse) {
    const scopes = Object.keys(this.options.addons);
    // loop all addons scopes (first level keys)
    for (let i=0; i<scopes.length; i++) {
      const scope = scopes[i];
      if (!data[scope]) continue;
    
      const scopedData = data[scope];
      const dataIsArray = Array.isArray(scopedData)
      const currentAddons = this.options.addons[scope];
      const addonsKeys = Object.keys(currentAddons);
      const addons = addonsKeys
        .filter(key => !!currentAddons[key] && methods[key])
      
      for (let i=0; i<addons.length; i++) {
        const addon = addons[i];
        const method = methods[addon];
        // run a single time
        if (!dataIsArray) {
          await this.run(method, scopedData);
          continue;
        }
        // run for an array
        for (let i=0; i<scopedData.length; i++){
          await this.run(method, scopedData[i]);
        }
      }  
    }
    return data;
  }


  /**
   * Run addons on a data set
   * ==================================================
   */
  private async run( method: any, data: IndexerResponse ) {
    if (!data.addons) data.addons = {};
    const isAsync = typeof method.then === 'function' && method[Symbol.toStringTag] === 'Promise';
    if (isAsync) await method(data);
    else method(data);
  }
  
}

