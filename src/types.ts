import type Addons from './modules/addons/index.js';
import type Client from './modules/client/index.js';
import type Txns from './modules/txns/index.js';
import type NFDs from './modules/nfds/index.js';
import type Cache from './modules/cache/index.js';
import type Query from './modules/query/index.js';
import type Medias from './modules/medias/index.js';

// export * from './modules/addons/types.js';
// export * from './modules/client/types.js';
export * from './modules/txns/types.js';
export * from './modules/nfds/types.js';
export * from './modules/cache/types.js';
export * from './modules/query/types.js';
export * from './modules/medias/types.js';


export interface PlugableModules {
  Cache?: typeof Cache,
  Client?: typeof Client,
  Txns?: typeof Txns,
  Query?: typeof Query,
  Addons?: typeof Addons,
  NFDs?: typeof NFDs,
  Medias?: typeof Medias,
} 