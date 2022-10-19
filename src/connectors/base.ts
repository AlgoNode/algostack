import type { TransactionLike } from 'algosdk';


export default class BaseConnector {
  protected connector?;
  public async connect(): Promise<string[]|false> { return false };
  public async sign(txns: TransactionLike[]): Promise<Uint8Array[]|false> { return false};
  public disconnect(): void {};
}