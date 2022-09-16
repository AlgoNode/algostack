import BaseRunner from './_BaseAddon.js';
import { Payload } from '../../Query/index.js';
import { decodeBase64 } from '../../../helpers/encoding.js';

export default class DecodeNotes extends BaseRunner {
  constructor (data: Payload) {
    super(data, ['transaction', 'transactions'], 'note', {});
  }

  async transactions(txns: Payload) {
    if (!Array.isArray(txns)) return
    for (let i=0; i<txns.length; i++) {
      const txn = txns[i];
      await this.transaction(txn)
    }
  }
  
  async transaction(txn: Payload) {
    if (!txn.note) return;
    const note = decodeBase64(txn.note);
    this.save(txn, note);
  }
}