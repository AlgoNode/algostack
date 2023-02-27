import type Addons from '../addons.js';
import { Payload } from '../../query/index.js';
import NFDs from '../../nfds/nfds.js';
import BaseRunner from './_base.js';

export default class AssetNFDs extends BaseRunner { 
  protected nfds: NFDs;
  constructor (data: Payload, forwarded: Addons) {
    super(data, ['asset', 'assets', 'account',], 'nfds', {});
    this.nfds = forwarded?.nfds;
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

  async account(account: Payload) {
    if (!account.address) return;
    if (!['sig','msig'].includes(account.sigType)) return;
    const nfds = await this.nfds.getNFDs(account.address);
    return this.save(account, nfds);
  } 
}