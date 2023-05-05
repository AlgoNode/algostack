import algosdk, { Transaction, Account } from 'algosdk';
import BaseConnector from './base.js';

export default class Mnemonic extends BaseConnector {
  protected connector?: any = {};
  private account: Account;
  public ready: boolean = false;
  

  //
  // Connect account
  // ----------------------------------------------
  async connect(mnemonic: string): Promise<string[]|undefined> {
    if (!this.connector || !mnemonic) { 
      this.ready = undefined; 
      return; 
    } 
    // Warn if used on the client side
    if (typeof window !== 'undefined') {
      console.warn(`You shouldn't use mnemonic connection on the frontend.`);
    };

    // try to convert the mnemonic as an account
    try {
      this.account = algosdk.mnemonicToSecretKey(mnemonic);
      this.ready = true;
      return [this.account.addr];
    } catch (e) {
      this.ready = undefined;
    }
  }


  //
  // Sign transaction(s)
  // ----------------------------------------------
  public async sign(txns: Transaction[]): Promise<Uint8Array[]|undefined> { 
    if (!this.connector) return undefined;
    try {
      const signedTxns = txns.map(txn => txn.signTxn(this.account.sk));
      return signedTxns;
    } catch(err) {
      console.log(err);
      return undefined;
    }
  };
}