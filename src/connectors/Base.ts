import { Transaction } from 'algosdk';


export default class BaseConnector {
  protected connector?;
  public async connect(): Promise<string[]|false> { return false };
  public async sign(txn: Transaction): Promise<Uint8Array|Uint8Array[]|false> { return false};
  public disconnect(): void {};
}