// import Buffer from 'buffer';
import algosdk from 'algosdk';
import Algolib from '../index';
import Filters from '../utils/filters';
import Options from '../utils/options';
import Client from './client';



export type TxnsModule = typeof Txns;

//
// TXNS class
// ----------------------------------------------
export default class Txns {
  protected options: Options;
  protected filters: Filters;
  protected client: Client;
  public algosdk;
  public algod;

  constructor(forwarded: Algolib) {
    this.options = forwarded.options;
    this.filters = forwarded.filters;
    this.client = forwarded.client || new Client(forwarded);
    this.algod = new algosdk.Algodv2(
      this.options.apiToken || '', 
      this.options.apiUrl, 
      this.options.apiPort || ''
    );
  }

  //
  // Simple Transaction
  // ----------------------------------------------
  async txn(params) {
    try {
      const baseParams = await this.getTxnParams();
      const txn = new algosdk.Transaction({
        ...baseParams,
        ...params,
      }); 
      const signedTxn = await this.signTxn(txn);
      const response = await this.sendTxn(signedTxn);
      const confirmation = await this.wait(response.txId);
      return confirmation;
    }
    catch (error) {
      console.dir(error);
    }
  }

  //
  // Get txn params
  // ----------------------------------------------
  async getTxnParams () {
    const txn = await this.algod.getTransactionParams().do();
    return txn;
  }



  

  //
  // Sign
  // ----------------------------------------------
  async signTxn (txn) {
    if (!this.client || !this.client.connected || !this.client.sign) return false;
    const signedTxn = await this.client.sign(txn);
    return signedTxn;  
  } 

  //
  // Send transaction
  // ----------------------------------------------
  async sendTxn (signedTxn) {
    const txn = await this.algod.sendRawTransaction(signedTxn).do();
    return txn;
  }

  //
  // Wait for txn to be processed 
  // ----------------------------------------------
  async wait (txnId, maxBlocks = 10) {
    const confirmation = await algosdk.waitForConfirmation(this.algod, txnId, maxBlocks);
    return confirmation;
  }

}

