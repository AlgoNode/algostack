import { Payload } from '../../Query/index.js';
import { AssetCategory } from '../enums.js';
import BaseRunner from './_BaseRunner.js';

export default class Category extends BaseRunner {
  constructor (data: Payload) {
    super(data, 'category');
  }

  async run() {
    if (!this.data.params) return;
    if (this.data.params.total === 1) {
      this.save(AssetCategory.NFT);
    }
    if (this.data.params.total > 10000) {
      this.save(AssetCategory.TOKEN);
    }
  }
}