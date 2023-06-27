// import Buffer from 'buffer';
import type { TxnsConfigs } from './types.js';
import { BaseModule } from '../_baseModule.js';
import algosdk, { Transaction, TransactionLike } from 'algosdk';
import camelcaseKeys from 'camelcase-keys';
import AlgoStack from '../../index.js';
import options from '../../utils/options.js';
import Client from '../client/index.js';
import merge from 'lodash/merge.js';



/**
 * Txns class
 * ==================================================
 */
export default class Txns extends BaseModule {
  private configs: TxnsConfigs;
  protected client: Client;
  public algosdk;
  public algod;

  constructor(configs: TxnsConfigs = {}) {
    super();
    this.configs = merge({
      wait: true,
    }, configs); 
  }

  public init(stack: AlgoStack) {
    super.init(stack);
    
    this.algod = new algosdk.Algodv2(
      this.stack.configs.apiToken || '', 
      this.stack.configs.apiUrl, 
      this.stack.configs.apiPort || ''
    );

    this.client = stack.client;
    if (!this.client) throw('Client module is required');
    return this;
  }


  private getConfig(key: keyof TxnsConfigs, configs?: TxnsConfigs) {
    return configs?.[key] !== undefined 
      ? configs[key]
      : this.configs[key];
  }

  //
  // Single Transaction
  // ----------------------------------------------
  async sendTxn(params: Record<string, any>, configs?: TxnsConfigs): Promise<Record<string,any>|undefined> {
    
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
      if (!this.getConfig('wait', configs)) {
        return camelcaseKeys(response, { deep: true });
      }
      const confirmation = await this.wait(response.txId);
      return {
        ...confirmation,
        txId: response.txId,
      };
    }
    catch (error) {
      console.dir(error);
    }
  }

  //
  // Grouped Transactions
  // ----------------------------------------------
  async sendGroupedTxns(paramsGroup: Record<string, any>[], configs?: TxnsConfigs): Promise<Record<string,any>|undefined>  {
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
      if (!this.getConfig('wait', configs)) {
        return camelcaseKeys(response, { deep: true });
      }
      const confirmation = await this.wait(response.txId);
      return {
        ...confirmation,
        txId: response.txId,
      };

    }
    catch (error) {
      console.dir(error);
    }
  }

  //
  // Sequenced transactions
  // ----------------------------------------------
  async sendSequencedTxns(paramsSequence: TransactionLike[], configs?: TxnsConfigs): Promise<Record<string,any>[]|undefined>  {
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
        confirmations.push( confirmation );
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
  async wait (txnId, maxBlocks = 10): Promise<Record<string, any>> {
    const confirmation = await algosdk.waitForConfirmation(this.algod, txnId, maxBlocks);
    return camelcaseKeys(confirmation, { deep: true });
  }

}

