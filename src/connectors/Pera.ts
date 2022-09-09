
import algosdk, { Transaction } from 'algosdk';
import { PeraWalletConnect } from "@perawallet/connect";
import { SignerTransaction } from "@perawallet/connect/dist/util/model/peraWalletModels";
import { formatJsonRpcRequest } from '@json-rpc-tools/utils';
import BaseConnector from './Base.js';

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
  public async connect (): Promise<string[]|false> {
    if (!this.connector) return false;
    
    // connect
    try {
      const addresses = await this.connector.connect();
      console.log('connect')
      return addresses;
    } 
    catch (err) {
      console.error(err);
  
    }
  }

  //
  // Connect account
  // ----------------------------------------------
  public async reconnect (): Promise<string[]|false> {
    if (!this.connector) return false;
    try {
      const addresses = await this.connector.reconnectSession();;
      return addresses;
    } 
    catch (err) {
      console.error(err);
  
    }
  }




  //
  // Sign transaction(s)
  // ----------------------------------------------
  public async sign(txns: Transaction[]): Promise<Uint8Array[]|false> { 
    if (!this.connector) return false;
    const peraTxns = txns.map(txn => ({ txn })) ; // <------ HERE !
    try {
      const result = await this.connector.signTransaction([peraTxns]);
      const signedBytes = result.map(arr => Uint8Array.from(arr));
      return signedBytes;
    } catch(err) {
      console.log(err);
      return false;
    }
  };

  //
  // Disconnect
  // ----------------------------------------------
  disconnect() {
    if (!this.connector) return;
    this.connector.disconnect();
  }
}