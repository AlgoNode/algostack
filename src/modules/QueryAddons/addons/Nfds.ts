import pick from 'lodash/pick.js';
import BaseRunner from './_BaseAddon.js';
import { Payload } from '../../Query/index.js';
import Addons from '../QueryAddons.js';

export default class AssetNFDs extends BaseRunner { 
  constructor (data: Payload) {
    super(data, ['asset', 'assets'], 'nfds', {});
  }


  async assets(asas: Payload) {
    if (!Array.isArray(asas)) return
    for (let i=0; i<asas.length; i++) {
      const asa = asas[i];
      await this.asset(asa)
    }
  }
  
  async asset(asa: Payload) {
    if (!asa.params) return;
    
  } 

  // async run(forwarded: Addons) {
  //   if (!forwarded.nfds) return;
  //   if (!this.data.params) return;
  //   const mapped = await forwarded.nfds.map(
  //       pick(this.data.params, [
  //         'creator', 
  //         'manager', 
  //         'reserve', 
  //         'freeze', 
  //         'clawback',
  //       ])
  //     );
  //   this.save(mapped);
  // }
}