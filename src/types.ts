import type Client from './modules/client/index.js';
import type Txns from './modules/txns/index.js';
import type NFDs from './modules/nfds/index.js';
import type Cache from './modules/cache/index.js';
import type Query from './modules/query/index.js';
import type Medias from './modules/medias/index.js';
import type Files from './modules/files/files.js';


export interface PlugableModules {
  cache?: Cache,
  client?: Client,
  txns?: Txns,
  query?: Query,
  nfds?: NFDs,
  medias?: Medias,
  files?: Files,
}

export type { Configs } from './utils/configs.js';

export * from './enums.js';
export * from './modules/client/types.js';
export * from './modules/txns/types.js';
export * from './modules/nfds/types.js';
export * from './modules/cache/types.js';
export * from './modules/query/types.js';
export * from './modules/medias/types.js';

