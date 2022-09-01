import { Payload } from '../../Query/types.js';
import { Arc } from '../enums.js';
import BaseRunner from './_BaseRunner.js';

export default class Arcs extends BaseRunner {
  constructor (data: Payload) {
    super(data, 'arcs', []);
  }
  async run() {
    if (!this.data.params) return;
    const url = this.data.params.url;
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
    // ARC 69 (not 100% valid...)
    // if ( /(#i|#v|#a|#p|#h)$/.test(url) ) {
    //   arcs.push(Arc.ARC69);
    // }
    this.save(arcs);
  }
}