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

  // Persist wallet connections, even after refreshing
  // Only available in browsers
  persistConnection?: boolean,
  storageNamespace?: string,

  // NFD api Url
  nfdApiUrl?: string,
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

  public persistConnection = true;
  public storageNamespace = 'algostack';

  public NFDApiUrl = 'https://api.nf.domains';
  

  constructor (userOptions?: OptionsProps) {
    merge(this, userOptions);
  }
}

