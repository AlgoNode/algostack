export type Modes = 'MAINNET' | 'TESTNET' | 'BETANET';
export type Cases = 'kebabcase' | 'snakecase' | 'camelcase' | 'none';

//
// All options available in Algolib
// ----------------------------------------------
export interface OptionsProps {
  // Network mode
  mode?: Modes,
  // Indexer and Node urls used to interact with the blockchain
  indexerAPI?: string,
  nodeAPI?: string,
  // The case to use for variables names. 
  // They'll be automatically converted when interacting with the blockchain.
  convertCase?: Cases,
}


//
// Options class
// ----------------------------------------------
export default class Options {
  public mode = 'MAINNET';
  public indexerAPI = 'https://mainnet-idx.algonode.cloud';
  public nodeAPI = 'https://mainnet-api.algonode.cloud';
  public convertCase = 'none';

  constructor (userOptions?: OptionsProps) {
    Object.assign(this, userOptions);
  }
}

