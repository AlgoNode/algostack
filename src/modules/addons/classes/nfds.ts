import BaseRunner from './_base.js';
import { Payload } from '../../query/index.js';

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
    // TODO : map nfds
  } 

}