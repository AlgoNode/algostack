import BaseRunner from './_base.js';
import { Payload } from '../../query/index.js';
import { AssetCategory } from '../enums.js';

export default class Category extends BaseRunner {
  constructor (data: Payload) {
    super(data, ['asset', 'assets'], 'category', undefined);
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
    if (asa.params.total <= 100 ) {
      this.save(asa, AssetCategory.NFT);
    }
    else {
      this.save(asa, AssetCategory.TOKEN);
    }
  } 
}
