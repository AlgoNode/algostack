import BaseRunner from './_base.js';
import { Payload } from '../../query/index.js';
import { Arc } from '../enums.js';

export default class Arcs extends BaseRunner {
  constructor (data: Payload) {
    super(data, ['asset', 'assets'], 'arcs', []);
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
    const url = asa.params.url;
    const arcs:Arc[] = [];
    if (!Boolean(url)) return;
    // ARC 3
    if ( /(#arc3|@arc3)$/.test(url) ) {
      arcs.push(Arc.ARC3);
    }
    // ARC 19
    if ( url.startsWith('template-ipfs://') ) {
      arcs.push(Arc.ARC19);
    }
    this.save(asa, arcs);
  } 
}
