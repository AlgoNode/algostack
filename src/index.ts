import polyfills from './helpers/polyfills';
import Options, { OptionsProps } from './utils/options';
import Filters from './utils/filters';
import Storage from './utils/storage';
import { QueryModule } from './modules/query';
import { ClientModule } from './modules/client';
// export { default as Query } from './modules/query';
// export { default as Client } from './modules/client';

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
    this.plugModule('Query', modules);
    this.plugModule('Client', modules);
  }

  //
  // Pluggable modules initiator
  // ----------------------------------------------
  plugModule(key: string, modules: PlugableModule[]) {
    const module = modules.find(module => module.prototype.constructor.name === key);
    if (module) {
      this[key.toLowerCase()] = new module(this);
    }
  }
}
