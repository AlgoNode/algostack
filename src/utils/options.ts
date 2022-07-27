export type Modes = 'MAINNET' | 'TESTNET' | 'BETANET';
export type Cases = 'kebabcase' | 'snakecase' | 'camelcase' | 'none';

//
// All options available in Algolib
// ----------------------------------------------
export interface OptionsProps {
  // Network mode
  mode?: Modes,
  // Indexer and Node urls used to interact with the blockchain
  indexerUrl?: string,
  apiUrl?: string,
  apiPort?: number,
  apiToken?: string,
  
  // The case to use for variables names. 
  // They'll be automatically converted when interacting with the blockchain.
  convertCase?: Cases,
  // localstorage namespace
  storageNamespace?: string,
  // persist wallet connections, even after reload
  persistConnection?: boolean,
}


//
// Options class
// ----------------------------------------------
export default class Options {
  public mode = 'MAINNET';
  public indexerUrl = 'https://mainnet-idx.algonode.cloud';
  public apiUrl = 'https://mainnet-api.algonode.cloud';
  public apiToken = undefined;
  public apiPort = undefined;
  public convertCase = 'none';
  public storageNamespace = 'algolib';
  public persistConnection = true;

  constructor (userOptions?: OptionsProps) {
    Object.assign(this, userOptions);
  }
}

