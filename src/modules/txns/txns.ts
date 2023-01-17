// import Buffer from 'buffer';
import algosdk, { Transaction, TransactionLike } from 'algosdk';
import camelcaseKeys from 'camelcase-keys';
import AlgoStack from '../../index.js';
import options from '../../utils/options.js';
import Client from '../client/index.js';


/**
 * Txns class
 * ==================================================
 */
export default class Txns {
  protected client: Client;
  public algosdk;
  public algod;

  constructor(forwarded: AlgoStack) {
    this.client = forwarded.client || new Client(forwarded);
    this.algod = new algosdk.Algodv2(
      options.apiToken || '', 
      options.apiUrl, 
      options.apiPort || ''
    );
  }

  //
  // Single Transaction
  // ----------------------------------------------
  async sendTxn(params: Record<string, any>): Promise<Record<string,any>|undefined> {
    
    try {
      const baseParams = await this.getTxnParams();
      const txn = new algosdk.Transaction({
        ...baseParams,
        ...params,
      }); 
      const signedTxn = await this.signTxn(txn);
      if (!signedTxn) return;
      const response = await this.submitTxn(signedTxn);
      if (!response.txId) return;
      const confirmation = await this.wait(response.txId);
      return camelcaseKeys(confirmation, { deep: true });
    }
    catch (error) {
      console.dir(error);
    }
  }

  //
  // Grouped Transactions
  // ----------------------------------------------
  async sendGroupedTxns(paramsGroup: Record<string, any>[]): Promise<Record<string,any>|undefined>  {
    try {
      const baseParams = await this.getTxnParams();
      let group: Transaction[] = [];
      paramsGroup.forEach(params => {
        group.push( new algosdk.Transaction({
          ...baseParams,
          ...params,
        })); 
      });
      const groupId = algosdk.computeGroupID(group);
      group.forEach(txn => {
        txn.group = groupId;
      });
      const signedTxns = await this.signTxn(group);
      if (!signedTxns) return;
      const response = await this.submitTxn(signedTxns);
      if (!response.txId) return;
      const confirmation = await this.wait(response.txId);
      return camelcaseKeys(confirmation, { deep: true });

    }
    catch (error) {
      console.dir(error);
    }
  }

  //
  // Sequenced transactions
  // ----------------------------------------------
  async sendSequencedTxns(paramsSequence: TransactionLike[]): Promise<Record<string,any>[]|undefined>  {
    try {
      const baseParams = await this.getTxnParams();
      let sequence: Transaction[] = [];
      paramsSequence.forEach(params => {
        sequence.push( new algosdk.Transaction({
          ...baseParams,
          ...params,
        })); 
      });
    
      const signedTxns = await this.signTxn(sequence);
      if (!signedTxns) return;
      const confirmations: any[] = [];

      for(let i=0; i<signedTxns.length; i++) {
        const response = await this.submitTxn(signedTxns[i]);
        if (!response.txId) return;
        const confirmation = await this.wait(response.txId);
        confirmations.push(
          camelcaseKeys(confirmation, { deep: true })
        );
      }
      return confirmations;
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
  async signTxn (txns: Transaction|Transaction[]): Promise<Uint8Array[]|false> {
    if (!this.client || !this.client.connector) return false;
    if (!Array.isArray(txns)) txns = [txns];
    const signedTxns = await this.client.connector.sign(txns);
    return signedTxns;  
  } 

  //
  // Send transaction
  // ----------------------------------------------
  async submitTxn (signedTxn: Uint8Array|Uint8Array[]) {
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

