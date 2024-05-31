import type { GlobalConfigs } from './utils/configs.js';
import type { ModulesConfigs, PlugableModules } from './types.js';
import type { LookupMethods, SearchMethods } from './modules/query/index.js';
import type Client from './modules/client/index.js';
import type Txns from './modules/txns/index.js';
import type NFDs from './modules/nfds/index.js';
import type Cache from './modules/cache/index.js';
import type Query from './modules/query/index.js';
import type Medias from './modules/medias/index.js';
import type Files from './modules/files/index.js';
import merge from 'lodash-es/merge.js';
import defaultGlobalConfigs from './utils/configs.js';
export * from './enums.js';
export * from './types.js';

export default class AlgoStack {
  // Utils
  public configs: GlobalConfigs;

  // Modules
  public client?: Client;
  public txns?: Txns;
  public query?: Query;
  public nfds?: NFDs;
  public medias?: Medias;
  public files?: Files;
  public cache?: Cache;
  
  // Methods
  public lookup?: LookupMethods;
  public search?: SearchMethods;


  constructor (configs: GlobalConfigs = {}, modules: PlugableModules = {}) {
    this.configs = merge(defaultGlobalConfigs, configs);
    // Add modules
    if (modules.cache) this.cache = modules.cache;
    if (modules.nfds) this.nfds = modules.nfds;
    if (modules.client) this.client = modules.client;
    if (modules.txns) this.txns = modules.txns;
    if (modules.files) this.files = modules.files;
    if (modules.medias) this.medias = modules.medias;
    if (modules.query) {
      this.query = modules.query;
      this.lookup = this.query.lookup;
      this.search = this.query.search;
    } 

    if (this.configs.autoInit) this.init();
  }

  /**
  * Extend the configs
  * ==================================================
  */
  public setConfigs(configs: ModulesConfigs) {
    if (configs.global) this.configs =  merge(defaultGlobalConfigs, configs.global)
    Object.entries(configs).forEach(([module, configs]) => {
      if (this[module]) this[module].setConfigs(configs)
    });
  }

  /**
  * Initiate all module instances
  * ==================================================
  */
  public init() {
    if (this.cache) this.cache.init(this);
    if (this.nfds) this.nfds.init(this);
    if (this.client) this.client.init(this);
    if (this.txns) this.txns.init(this);
    if (this.files) this.files.init(this);
    if (this.medias) this.medias.init(this);
    if (this.query) this.query.init(this);
  }
}
