import polyfills from './helpers/polyfills';
import Options, { OptionsProps } from './utils/options';
import Filters from './utils/filters';
import Storage from './utils/storage';
import type Query from './modules/query';
import type Client from './modules/client';
import type Txns from './modules/txns';
import type { QueryModule } from './modules/query';
import type { ClientModule } from './modules/client';
import type { TxnsModule } from './modules/txns';

export interface PlugableModules {
  Query?: QueryModule,
  Client?: ClientModule,
  Txns?: TxnsModule,
} 


polyfills;
export default class Algolib {
  // Utils
  public options: Options;
  public filters: Filters;
  public storage: Storage;
  // Modules
  public query?: Query;
  public client?: Client;
  public txns?: Txns;

  constructor (userOptions?: OptionsProps, modules: PlugableModules = {}) {
    this.options = new Options(userOptions);
    this.filters = new Filters(this);
    this.storage = new Storage(this);
    if (modules.Query) this.query = new modules.Query(this);
    if (modules.Client) this.client = new modules.Client(this);
    if (modules.Txns) this.txns = new modules.Txns(this);

  }


}
