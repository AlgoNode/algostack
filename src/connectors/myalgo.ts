import type { ConnectionSettings } from '@randlabs/myalgo-connect';
import MyAlgoConnect from '@randlabs/myalgo-connect';
import { Transaction } from 'algosdk';
import BaseConnector from './base.js';

export default class MyAlgo extends BaseConnector {
  protected connector?: MyAlgoConnect = undefined;
  constructor() {
    super();
    if (typeof window === 'undefined') return;
    this.connector = new MyAlgoConnect();
  }

  //
  // Connect account
  // ----------------------------------------------
  async connect(options: ConnectionSettings = {}): Promise<string[]|undefined> {
    if (!this.connector) return undefined;
    try {
      const accounts = await this.connector.connect({
        shouldSelectOneAccount: true,
        ...options,
      });
      const addresses = accounts.map(account => account.address);
      return addresses;
    } 
    catch {
      return undefined;
    }
  }

  //
  // Sign transaction(s)
  // ----------------------------------------------
  public async sign(txns: Transaction[]): Promise<Uint8Array[]|undefined> { 
    if (!this.connector) return undefined;
    try {
      const txnsBytes = txns.map(txn => txn.toByte());
      const result = await this.connector.signTransaction(txnsBytes);
      const signedBytes = result.map(signed => signed.blob);
      return signedBytes;
    } catch (e) {
      console.error(e)
      return undefined;
    }
  };
}