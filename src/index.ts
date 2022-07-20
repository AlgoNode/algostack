import polyfills from './helpers/polyfills';
import Options, { OptionsProps } from './utils/options';
import Filters from './utils/filters';
import Storage from './utils/storage';
import Query, { QueryModule } from './modules/query';
import Client, { ClientModule } from './modules/client';
export { default as Query } from './modules/query';
export { default as Client } from './modules/client';

export type PlugableModule = QueryModule | ClientModule;


polyfills;
export default class Algolib {
  // Utils
  public options: Options;
  public filters: Filters;
  public storage: Storage;
  // Modules
  public query?: QueryModule;
  public client?: ClientModule;

  constructor (modules: PlugableModule[] = [], userOptions?: OptionsProps,) {
    this.options = new Options(userOptions);
    this.filters = new Filters(this);
    this.storage = new Storage(this);
    this.plugModule(modules, 'query', Query);
    this.plugModule(modules, 'client', Client);
  }

  //
  // Pluggable modules initiator
  // ----------------------------------------------
  plugModule(modules: PlugableModule[], key: string, module: PlugableModule) {
    const userModule = modules.find(userModule => userModule === module);
    if (module) {
      this[key] = new module(this);
    }
  }
}
