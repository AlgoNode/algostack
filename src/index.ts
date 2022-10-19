import polyfills from './helpers/polyfills.js';
import Options, { OptionsProps } from './utils/options.js';
import Storage from './utils/storage.js';
import type QueryAddons from './modules/QueryAddons/index.js';
import type Client from './modules/Client/index.js';
import type Txns from './modules/Txns/index.js';
import type NFDs from './modules/NFDs/index.js';
import type Cache from './modules/Cache/index.js';
import type Query from './modules/Query/index.js';
import type Contract from './modules/Contract/index.js';
import type { LookupMethods, SearchMethods } from './modules/Query/index.js';
import * as encodingHelpers from './helpers/encoding.js';
export type { OptionsProps } from './utils/options.js';

export interface PlugableModules {
  Client?: typeof Client,
  Txns?: typeof Txns,
  Contract?: typeof Contract,
  Query?: typeof Query,
  QueryAddons?: typeof QueryAddons,
  NFDs?: typeof NFDs,
  Cache?: typeof Cache,
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
  public contract?: Contract;
  public query?: Query;
  public queryAddons?: QueryAddons;
  public nfds?: NFDs;
  public cache?: Cache;
  
  // Methods
  public lookup?: LookupMethods;
  public search?: SearchMethods;

  constructor (userOptions?: OptionsProps, modules: PlugableModules = {}) {
    this.options = new Options(userOptions);
    this.storage = new Storage(this);

    // Add modules
    if (modules.Cache) this.cache = new modules.Cache(this);
    if (modules.Client) this.client = new modules.Client(this);
    if (modules.Txns) this.txns = new modules.Txns(this);
    if (modules.Contract) this.contract = new modules.Contract(this);
    if (modules.NFDs) this.nfds = new modules.NFDs(this);
    if (modules.QueryAddons) this.queryAddons = new modules.QueryAddons(this);
    if (modules.Query) {
      this.query = new modules.Query(this);
      this.lookup = this.query.lookup;
      this.search = this.query.search;
    } 

    // Init
    if (this.cache) this.cache.init(this);
  }
}
