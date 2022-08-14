import polyfills from './helpers/polyfills.js';
import Options, { OptionsProps } from './utils/options.js';
import Filters from './utils/filters.js';
import Storage from './utils/storage.js';
import type Query from './modules/query.js';
import type Client from './modules/client.js';
import type Txns from './modules/txns.js';
import type { QueryModule, LookupMethods, SearchMethods } from './modules/query.js';
import type { ClientModule } from './modules/client.js';
import type { TxnsModule } from './modules/txns.js';

export interface PlugableModules {
  Query?: QueryModule,
  Client?: ClientModule,
  Txns?: TxnsModule,
} 


polyfills;
export default class AlgoStack {
  // Utils
  public options: Options;
  public filters: Filters;
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
    this.filters = new Filters(this);
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
