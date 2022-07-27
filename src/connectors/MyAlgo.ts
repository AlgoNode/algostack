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
  public async sign(txns: Transaction): Promise<Uint8Array|Uint8Array[]|false> { 
    if (!this.connector) return false;
    try {
      const txnBytes = txns.toByte();
      const result = await this.connector.signTransaction(txnBytes);
      const signedBytes = result.blob;
      console.log('myalgo signed');
      return signedBytes;
    } catch(err) {
      console.log(err);
      return false;
    }
  };
}