import { SendOptions } from "../modules/txns/types.js";

export type Modes = 'MAINNET' | 'TESTNET' | 'BETANET';
export type DurationString = string;

/**
 * All options available in AlgoStack
 * ==================================================
 */
export interface OptionsProps {
  version?: number,
  // Indexer and Node urls used to interact with the blockchain
  indexerUrl?: string,
  apiUrl?: string,
  apiPort?: number,
  apiToken?: string,
  // NFD api Url
  nfdApiUrl?: string,
  // IPFS
  ipfsGatewayUrl?: string,

  // Persist wallet connections, even after refreshing
  // Only available in browsers
  persistConnection?: boolean,
  storageNamespace?: string,

  // Custom Cache Stores
  // For custom query endpoints, 
  // ...or anything else you want to cache using the cache module
  // cache will be indexed using the params object
  customCaches?: string[],

  // Cache expiration 
  // Format: 1w, 1d, 1h, 1m, 1s, 1ms 
  // Works with custom stores too!
  cacheExpiration?: {
    default?: DurationString,
    [k:string]: DurationString,
  },


  // Send txn options
  sendOptions?: SendOptions,

  
}


/**
 * default optionts
 * ==================================================
 */
const options: OptionsProps = {
  version: 1.12,
  indexerUrl: 'https://mainnet-idx.algonode.cloud',
  apiUrl: 'https://mainnet-api.algonode.cloud',
  apiToken: undefined,
  apiPort: undefined,
  nfdApiUrl: 'https://api.nf.domains',
  ipfsGatewayUrl: 'https://ipfs.algonode.xyz/ipfs',

  persistConnection: true,
  storageNamespace: 'algostack',

  customCaches: undefined,
  cacheExpiration: {
    default: '1h',
    'indexer/asset': '1w',
    'indexer/assetBalances': '2s',
    'indexer/assetTransactions': '2s',
    'indexer/assets': '5m',
    'indexer/block': '1w',
    'indexer/transaction': '1w',
    'node/account': '10s',
    'node/teal': '6h',
    'nfd/lookup': '1h',
    'nfd/search': '1m',
    'addons/icon': '1d',
    'medias/asset': '1d',
  },

  sendOptions: {
    wait: true,
  },
}

export default options;

