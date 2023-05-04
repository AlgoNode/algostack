import merge from 'lodash/merge.js';
import Storage from './utils/storage.js';
import options, { OptionsProps } from './utils/options.js';
import type Client from './modules/client/index.js';
import type Txns from './modules/txns/index.js';
import type NFDs from './modules/nfds/index.js';
import type Cache from './modules/cache/index.js';
import type Query from './modules/query/index.js';
import type Medias from './modules/medias/index.js';
import type { LookupMethods, SearchMethods } from './modules/query/index.js';
import type { PlugableModules } from './types.js';

export type { OptionsProps } from './utils/options.js';
export * from './types.js';
export * from './enums.js';


export default class AlgoStack {
  // Utils
  public storage: Storage;

  // Modules
  public client?: Client;
  public txns?: Txns;
  public query?: Query;
  public nfds?: NFDs;
  public medias?: Medias;
  public cache?: Cache;
  
  // Methods
  public lookup?: LookupMethods;
  public search?: SearchMethods;

  constructor (userOptions?: OptionsProps, modules: PlugableModules = {}) {
    merge(options, userOptions);
    this.storage = new Storage();

    // Add modules
    if (modules.Cache && typeof window !== 'undefined') this.cache = new modules.Cache();
    if (modules.NFDs) this.nfds = new modules.NFDs(this);
    if (modules.Client) this.client = new modules.Client(this);
    if (modules.Txns) this.txns = new modules.Txns(this);
    if (modules.Medias) this.medias = new modules.Medias(this);
    if (modules.Query) {
      this.query = new modules.Query(this);
      this.lookup = this.query.lookup;
      this.search = this.query.search;
    } 

    // Delayed init when all modules are added
    if (this.cache) this.cache.init(this);

  }
}
