import AlgoStack from '../../index.js';
import Options from '../../utils/options.js';
import type NFDs from '../../modules/NFDs/index.js';
import type { Payload } from '../Query/index.js';
import runners from './runners/index.js';

//
// QUERY ADDONS class
// ----------------------------------------------
export default class Addons {
  protected options: Options;
  public nfds?: NFDs;
  constructor(forwarded: AlgoStack) {
    this.options = forwarded.options;
    this.nfds = forwarded.nfds;
  }



  /**
   * Check for addon
   * ==================================================
   */
  public async applyOn(data: Payload) {
    const scopes = Object.keys(this.options.addons);
    // loop all addons scopes (first level keys)
    for (let i=0; i<scopes.length; i++) {
      const scope = scopes[i];
      if (!data[scope]) continue;
    
      const scopedData = data[scope];
      const dataIsArray = Array.isArray(scopedData)
      const currentAddons = this.options.addons[scope];
      const currentRunners = Object.keys(currentAddons)
        .filter(key => ( 
          currentAddons[key] === true
          && runners[scope]?.[key]
        ))
        .map( key => runners[scope][key]);
            
      for (let i=0; i<currentRunners.length; i++) {
        const runner = currentRunners[i];

        // run a single time
        if (!dataIsArray) {
          await new runner(scopedData).run(this);
          continue;
        }
        // run for an array
        for (let i=0; i<scopedData.length; i++){
          await new runner(scopedData[i]).run(this);
        }
      }  
    }
    return data;
  }

  
}

