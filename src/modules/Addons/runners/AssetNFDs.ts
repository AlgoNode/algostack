import { Payload } from '../../Query/index.js';
import Addons from '../Addons.js';
import BaseRunner from './_BaseRunner.js';
import pick from 'lodash/pick.js';

export default class AssetNFDs extends BaseRunner {
  constructor (data: Payload) {
    super(data, 'nfds', {});
  }

  async run(forwarded: Addons) {
    if (!forwarded.nfds) return;
    if (!this.data.params) return;
    const mapped = await forwarded.nfds.map(
        pick(this.data.params, [
          'creator', 
          'manager', 
          'reserve', 
          'freeze', 
          'clawback',
        ])
      );
    this.save(mapped);
  }
}