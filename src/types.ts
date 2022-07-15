
export enum Mode {
  MAINNET = 'MAINNET',
  TESTNET = 'TESTNET',
  BETANET = 'BETANET',
}

export interface Options {
  mode: Mode,
  indexerAPI?: string,
  nodeAPI?: string,
}

export interface StringObj {
  [k: string]: string,
}