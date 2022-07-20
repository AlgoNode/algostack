import Algolib from "../index";
import Options from "./Options";

//
// Storage class
// ----------------------------------------------
export default class Storage {
  protected options: Options;
  public available: boolean = true;
  public data: Object = {}

  constructor(forwarded: Algolib) {
    this.options = forwarded.options;
    this.available = typeof localStorage !== 'undefined';
    if (!this.available) return;
    this.preload();

  }

  //
  // preload all data
  // ----------------------------------------------
  preload() {
    if (!this.available) return false;
    const raw: string = localStorage.getItem(this.options.storageNamespace) || '{}';
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
    localStorage.setItem(this.options.storageNamespace, JSON.stringify(this.data));
  }
}

