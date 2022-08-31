import merge from 'lodash/merge.js';
export type Modes = 'MAINNET' | 'TESTNET' | 'BETANET';
export type Cases = 'kebabcase' | 'snakecase' | 'camelcase' | 'none';

/**
 * All options available in AlgoStack
 * ==================================================
 */
export interface OptionsProps {
  // Indexer and Node urls used to interact with the blockchain
  indexerUrl?: string,
  apiUrl?: string,
  apiPort?: number,
  apiToken?: string,
  
  // The case to use for variables names. 
  // They'll be automatically converted when interacting with the blockchain.
  convertCase?: Cases,

  // Persist wallet connections, even after refreshing
  // Only available in browsers
  persistConnection?: boolean,
  storageNamespace?: string,

  // NFD api Url
  nfdApiUrl?: string,

  // Enhance queries with more scope specific data
  enableAddons?: boolean,
  addons?: {
    asset?:  {
      category?: boolean,
      arcs?: boolean,
      nfds?: boolean,
    },
    assets?: {
      category?: boolean,
      arcs?: boolean,
      nfds?: boolean,
    },
    transaction?: {
      note?: boolean,
    },
    transactions?: {
      note?: boolean,
    },
  }
}


/**
 * Options Class
 * ==================================================
 */
export default class Options {
  public indexerUrl = 'https://mainnet-idx.algonode.cloud';
  public apiUrl = 'https://mainnet-api.algonode.cloud';
  public apiToken = undefined;
  public apiPort = undefined;

  public convertCase = 'none';
  
  public persistConnection = true;
  public storageNamespace = 'algostack';

  public NFDApiUrl = 'https://api.nf.domains';
  
  public enableAddons = true;
  public addons = {
    asset: {
      category: true,
      arcs: true,
      nfds: false,
    },
    assets: {
      category: true,
      arcs: false,
      nfds: false,
    },
    transaction: {
      note: true,
    },
    transactions: {
      note: true,
    }
  }


  constructor (userOptions?: OptionsProps) {
    merge(this, userOptions);
  }
}

