import polyfills from './helpers/polyfills.js';
import Options, { OptionsProps } from './utils/options.js';
import Storage from './utils/storage.js';
import type Addons from './modules/addons/index.js';
import type Client from './modules/client/index.js';
import type Txns from './modules/txns/index.js';
import type NFDs from './modules/nfds/index.js';
import type Cache from './modules/cache/index.js';
import type Query from './modules/query/index.js';
import type { LookupMethods, SearchMethods } from './modules/query/index.js';
import * as encodingHelpers from './helpers/encoding.js';
export type { OptionsProps } from './utils/options.js';

export interface PlugableModules {
  Cache?: typeof Cache,
  Client?: typeof Client,
  Txns?: typeof Txns,
  Query?: typeof Query,
  Addons?: typeof Addons,
  NFDs?: typeof NFDs,
} 

// Add polyfills
polyfills();

export default class AlgoStack {
  // Utils
  public options: Options;
  public storage: Storage;
  public helpers: Record<string, any> = {
    ...encodingHelpers,
  };
  
  // Modules
  public client?: Client;
  public txns?: Txns;
  public query?: Query;
  public addons?: Addons;
  public nfds?: NFDs;
  public cache?: Cache;
  
  // Methods
  public lookup?: LookupMethods;
  public search?: SearchMethods;

  constructor (userOptions?: OptionsProps, modules: PlugableModules = {}) {
    this.options = new Options(userOptions);
    this.storage = new Storage(this);

    // Add modules
    if (modules.Cache && typeof window !== 'undefined') this.cache = new modules.Cache(this);
    if (modules.Client) this.client = new modules.Client(this);
    if (modules.Txns) this.txns = new modules.Txns(this);
    if (modules.NFDs) this.nfds = new modules.NFDs(this);
    if (modules.Addons) this.addons = new modules.Addons(this);
    if (modules.Query) {
      this.query = new modules.Query(this);
      this.lookup = this.query.lookup;
      this.search = this.query.search;
    } 

    // Init
    if (this.cache) this.cache.init(this);
  }
}
