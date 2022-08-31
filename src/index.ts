import polyfills from './helpers/polyfills.js';
import Options, { OptionsProps } from './utils/options.js';
import Convert from './utils/convert.js';
import Encoder from './utils/encoder.js';
import Storage from './utils/storage.js';
import type Addons from './modules/Addons/index.js';
import type Client from './modules/Client/index.js';
import type Txns from './modules/Txns/index.js';
import type NFDs from './modules/NFDs/index.js';
import type Query from './modules/Query/index.js';
import type { LookupMethods, SearchMethods } from './modules/Query/index.js';

export interface PlugableModules {
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
  public convert: Convert;
  public encoder: Encoder;
  public storage: Storage;
  
  // Modules
  public client?: Client;
  public txns?: Txns;
  public query?: Query;
  public addons?: Addons;
  public nfds?: NFDs;
  
  // Methods
  public lookup?: LookupMethods;
  public search?: SearchMethods;

  constructor (userOptions?: OptionsProps, modules: PlugableModules = {}) {
    this.options = new Options(userOptions);
    this.storage = new Storage(this);
    this.convert = new Convert(this);
    this.encoder = new Encoder();
    if (modules.Addons) this.addons = new modules.Addons(this);
    if (modules.Client) this.client = new modules.Client(this);
    if (modules.Txns) this.txns = new modules.Txns(this);
    if (modules.Query) {
      this.query = new modules.Query(this);
      this.lookup = this.query.lookup;
      this.search = this.query.search;
    } 
    if (modules.NFDs) this.nfds = new modules.NFDs(this);
  }
}
