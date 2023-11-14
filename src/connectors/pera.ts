
import { Transaction } from 'algosdk';
import { PeraWalletConnect } from "@perawallet/connect";
import BaseConnector from './base.js';

export default class Pera extends BaseConnector {
  protected connector?: PeraWalletConnect = undefined;
  
  constructor() {
    super();
    if (typeof window === 'undefined') return;
    this.connector = new PeraWalletConnect();

    const persistedWC = JSON.parse(localStorage.getItem('walletconnect') || '{}');
    if (persistedWC.connected) {
      this.connector.reconnectSession();
    }
  }

  //
  // Connect account
  // ----------------------------------------------
  public async connect (): Promise<string[]|undefined> {
    if (!this.connector) return undefined;
    
    // connect
    try {
      const addresses = await this.connector.connect();
      this.connector.connector?.on('disconnect', this.disconnect.bind(this))
      return addresses;
    } 
    catch (e) {
      return undefined
    }
  }

  //
  // Connect account
  // ----------------------------------------------
  public async reconnect (): Promise<string[]|undefined> {
    if (!this.connector) return undefined;
    try {
      const addresses = await this.connector.reconnectSession();
      this.connector.connector?.on('disconnect', this.disconnect.bind(this))
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
    const unsignedTxns = txns.map(txn => ({ txn }));
    try {
      const result = await this.connector.signTransaction([unsignedTxns]);
      const signedBytes = result.map(arr => Uint8Array.from(arr));
      return signedBytes;
    } catch (e){
      console.error(e)
      return undefined;
    }
  };

  //
  // Disconnect
  // ----------------------------------------------
  public async disconnect() {
    if (!this.connector) return;
    await this.connector.disconnect();
  }
}