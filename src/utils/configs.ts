
/**
 * All configs available in AlgoStack
 * ==================================================
 */
export interface BaseConfigs {}

export interface GlobalConfigs extends BaseConfigs {
  version?: number,
  // Indexer and Node urls used to interact with the blockchain
  indexerUrl?: string,
  apiUrl?: string,
  apiPort?: number,
  apiToken?: string,
  autoInit?: boolean,
}


/**
 * default optionts
 * ==================================================
 */
const defaultGlobalConfigs: GlobalConfigs = {
  version: 2,
  indexerUrl: 'https://mainnet-idx.algonode.cloud',
  apiUrl: 'https://mainnet-api.algonode.cloud',
  apiToken: undefined,
  apiPort: undefined,
  autoInit: true,
}

export default defaultGlobalConfigs;

