import polyfills from './helpers/polyfills.js';
import Options, { OptionsProps } from './utils/options.js';
import Convert from './utils/convert.js';
import Storage from './utils/storage.js';
import type Query from './modules/query/index.js';
import type { QueryModule, LookupMethods, SearchMethods } from './modules/query/index.js';
import type Client from './modules/client/index.js';
import type { ClientModule } from './modules/client/index.js';
import type Txns from './modules/txns/index.js';
import type { TxnsModule } from './modules/txns/index.js';

export interface PlugableModules {
  Query?: QueryModule,
  Client?: ClientModule,
  Txns?: TxnsModule,
} 


polyfills;
export default class AlgoStack {
  // Utils
  public options: Options;
  public convert: Convert;
  public storage: Storage;
  
  // Modules
  public client?: Client;
  public txns?: Txns;
  public query?: Query;
  
  // Methods
  public lookup?: LookupMethods;
  public search?: SearchMethods;

  constructor (userOptions?: OptionsProps, modules: PlugableModules = {}) {
    this.options = new Options(userOptions);
    this.convert = new Convert(this);
    this.storage = new Storage(this);
    if (modules.Client) this.client = new modules.Client(this);
    if (modules.Txns) this.txns = new modules.Txns(this);
    if (modules.Query) {
      this.query = new modules.Query(this);
      this.lookup = this.query.lookup;
      this.search = this.query.search;
    } 
  }
}
