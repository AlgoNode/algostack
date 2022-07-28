import MyAlgoConnect from '@randlabs/myalgo-connect';
import algosdk, { Transaction } from 'algosdk';
import BaseConnector from './Base';

export default class MyAlgo extends BaseConnector {
  protected connector?: MyAlgoConnect;
  constructor() {
    super();
    if (typeof window === 'undefined') return;
    this.connector = new MyAlgoConnect();
  }

  //
  // Connect account
  // ----------------------------------------------
  async connect(): Promise<string[]|false> {
    if (!this.connector) return false;
    try {
      const accounts = await this.connector.connect({shouldSelectOneAccount: true});
      const addresses = accounts.map(account => account.address);
      return addresses;
    } 
    catch (err) {
      console.error(err);
      return false;
    }
  }

  //
  // Sign transaction(s)
  // ----------------------------------------------
  public async sign(txns: Transaction[]): Promise<Uint8Array[]|false> { 
    if (!this.connector) return false;
    try {
      const txnsBytes = txns.map(txn => txn.toByte());
      const result = await this.connector.signTransaction(txnsBytes);
      const signedBytes = result.map(signed => signed.blob);
      return signedBytes;
    } catch(err) {
      console.log(err);
      return false;
    }
  };
}