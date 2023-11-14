import type { TransactionLike } from 'algosdk';


export default class BaseConnector {
  protected connector?;
  public async connect(...args: any[]): Promise<string[]|undefined> { return undefined };
  public async sign(txns: TransactionLike[]): Promise<Uint8Array[]|undefined> { return undefined};
  public async disconnect(): Promise<void> {};
}