import type { Configs } from './utils/configs.js';
import type Client from './modules/client/index.js';
import type Txns from './modules/txns/index.js';
import type NFDs from './modules/nfds/index.js';
import type Cache from './modules/cache/index.js';
import type Query from './modules/query/index.js';
import type Medias from './modules/medias/index.js';
import type Files from './modules/files/files.js';
import { CacheConfigs } from './modules/cache/index.js';
import { ClientConfigs } from './modules/client/index.js';
import { TxnsConfigs } from './modules/txns/index.js';
import { QueryConfigs } from './modules/query/index.js';
import { NFDConfigs } from './modules/nfds/index.js';
import { MediasConfigs } from './modules/medias/index.js';
import { FilesConfigs } from './modules/files/types.js';


export type { Configs } from './utils/configs.js';
export * from './enums.js';
export * from './modules/client/types.js';
export * from './modules/txns/types.js';
export * from './modules/nfds/types.js';
export * from './modules/cache/types.js';
export * from './modules/query/types.js';
export * from './modules/medias/types.js';


export interface PlugableModules {
  cache?: Cache,
  client?: Client,
  txns?: Txns,
  query?: Query,
  nfds?: NFDs,
  medias?: Medias,
  files?: Files,
}  

export interface ModulesConfigs {
  global?: Configs,
  cache?: CacheConfigs,
  client?: ClientConfigs,
  txns?: TxnsConfigs,
  query?: QueryConfigs,
  nfds?: NFDConfigs,
  medias?: MediasConfigs,
  files?: FilesConfigs,
}  

export type ModuleKey = keyof ModulesConfigs;
