import AlgoStack from "../index.js";
import options from "./options.js";

//
// Storage class
// ----------------------------------------------
export default class Storage {
  public available: boolean = true;
  public data: Object = {}

  constructor(forwarded: AlgoStack) {
    this.available = typeof localStorage !== 'undefined';
    if (!this.available) return;
    this.preload();

  }

  //
  // preload all data
  // ----------------------------------------------
  preload() {
    if (!this.available) return false;
    const raw: string = localStorage.getItem(options.storageNamespace) || '{}';
    this.data = JSON.parse(raw);
  }
  
  //
  // Get data 
  // ----------------------------------------------
  get(key:string) {
    if (!this.available) return false;
    return this.data[key];
  }

  //
  // Save data 
  // ----------------------------------------------
  set(key: string, value: any) {
    if (!this.available) return false;
    this.data[key] = value;
    localStorage.setItem(options.storageNamespace, JSON.stringify(this.data));
  }
}

