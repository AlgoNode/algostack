
/**
 * All configs available in AlgoStack
 * ==================================================
 */
export interface BaseConfigs {}

export interface Configs extends BaseConfigs {
  version?: number,
  // Indexer and Node urls used to interact with the blockchain
  indexerUrl?: string,
  apiUrl?: string,
  apiPort?: number,
  apiToken?: string,
}


/**
 * default optionts
 * ==================================================
 */
const defaultConfigs: Configs = {
  version: 2,
  indexerUrl: 'https://mainnet-idx.algonode.cloud',
  apiUrl: 'https://mainnet-api.algonode.cloud',
  apiToken: undefined,
  apiPort: undefined,
}

export default defaultConfigs;

