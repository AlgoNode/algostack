import { Payload } from '../../Query/index.js';
import Addons from '../Addons.js';
import BaseRunner from './_BaseRunner.js';

export default class TxnNote extends BaseRunner {
  constructor (data: Payload) {
    super(data, 'note', {});
  }
  async run(forwarded: Addons) {
    if (!forwarded.encoder) return;
    if (!this.data.note) return;
    const note = this.data.note;
    // const note = forwarded.encoder.decodeNote(this.data.note);
    console.log(note)

    this.save(note);
  }
}