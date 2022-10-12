import { Payload } from '../../Query/index.js';


export default abstract class BaseAddon {
  public data: Payload;
  public scopes: string[];
  public key: string;
  public defaultValue: any;

  constructor ( data: Payload, scopes: string[], key: string, defaultValue?: any ) {
    this.data = data;
    this.key = key;
    this.scopes = scopes;
    this.defaultValue = defaultValue;
  }
  
  /**
   * Run scopes agains addon methods
   * ==================================================
   */
  async run() {
    for (let i=0; i<this.scopes.length; i++) {
      const scope = this.scopes[i];
      if (!this.data[scope] || !this[scope]) continue;
      const data = this.data[scope];
      await this[scope](data);
    }
  }
  
  /**
   * Save addon result
   * ==================================================
   */
  save (data: Payload, value: any) {
    if (!data.addons) data.addons = {};
    data.addons[this.key] = value || this.defaultValue;
  }
}