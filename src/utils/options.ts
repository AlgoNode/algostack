import merge from 'lodash/merge.js';
export type Modes = 'MAINNET' | 'TESTNET' | 'BETANET';
export type DurationString = string;

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

  // Cache expiration
  cacheExpiration?: {
    default: DurationString,
    [k:string]: DurationString,
  } 
}


/**
 * Options Class
 * ==================================================
 */
export default class Options implements OptionsProps {
  public indexerUrl = 'https://mainnet-idx.algonode.cloud';
  public apiUrl = 'https://mainnet-api.algonode.cloud';
  public apiToken = undefined;
  public apiPort = undefined;

  public persistConnection = true;
  public storageNamespace = 'algostack';

  public NFDApiUrl = 'https://api.nf.domains';

  public cacheExpiration = {
    default: '1h',
    asset: '1w',
    assets: '10s',
    block: '1w',
    transaction: '1w',
    nfds: '6h',
    icon: '1d',
  }
  

  constructor (userOptions?: OptionsProps) {
    merge(this, userOptions);
  }
}

