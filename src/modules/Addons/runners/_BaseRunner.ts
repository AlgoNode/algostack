import { Payload } from '../../Query/index.js';


export default abstract class BaseRunner {
  public data: Payload;
  public key: string;

  constructor ( data: Payload, key: string, defaultValue?: any ) {
    this.data = data;
    this.key = key;
    if (!data.addons) data.addons = {};
    if (typeof data.addons[key] === 'undefined') {
      data.addons[key] = defaultValue;
    }
  }

  save (value: any) {
    this.data.addons[this.key] = value;
  }
}