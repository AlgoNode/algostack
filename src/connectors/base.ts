import type { TransactionLike } from 'algosdk';


export default class BaseConnector {
  protected connector?;
  public async connect(): Promise<string[]|undefined> { return undefined };
  public async sign(txns: TransactionLike[]): Promise<Uint8Array[]|undefined> { return undefined};
  public disconnect(): void {};
}