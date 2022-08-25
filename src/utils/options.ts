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

  // Enhance queries with more scope specific data
  enableAddons?: boolean,
  addons?: {
    asset?:  {
      assetType?: boolean,
      nfd?: boolean,
    }
  }
}


/**
 * Options Class
 * ==================================================
 */
export default class Options {
  constructor (userOptions?: OptionsProps) {
    Object.assign(this, userOptions);
  }
  
  public indexerUrl = 'https://mainnet-idx.algonode.cloud';
  public apiUrl = 'https://mainnet-api.algonode.cloud';
  public apiToken = undefined;
  public apiPort = undefined;

  public convertCase = 'none';
  
  public persistConnection = true;
  public storageNamespace = 'algostack';
  
  public enableAddons = true;
  public addons = {
    asset: {
      assetType: true,
      nfd: false,
    },
    assets: {
      assetType: true,
    }
  }

}

