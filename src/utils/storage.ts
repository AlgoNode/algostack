//
// Storage class
// ----------------------------------------------
export default class Storage {
  private namespace: string;
  public available: boolean = true;
  public data: Object = {}

  constructor(namespace: string) {
    this.namespace = namespace;
    this.available = typeof localStorage !== 'undefined';
    if (!this.available) return;
    this.preload();
  }

  //
  // preload all data
  // ----------------------------------------------
  preload() {
    if (!this.available) return false;
    const raw: string = localStorage.getItem(this.namespace) || '{}';
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
    localStorage.setItem(this.namespace, JSON.stringify(this.data));
  }
}

