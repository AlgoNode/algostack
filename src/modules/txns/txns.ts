// import Buffer from 'buffer';
import type AlgoStack from '../../index';
import type { TransactionParams, TxnsConfigs } from './types';
import { BaseModule } from '../_baseModule.js';
import algosdk, { Transaction } from 'algosdk';
import camelcaseKeys from 'camelcase-keys';
import Client from '../client/index.js';
import merge from 'lodash-es/merge.js';



/**
 * Txns class
 * ==================================================
 */
export default class Txns extends BaseModule {
  private configs: TxnsConfigs = {};
  protected client: Client;
  public algosdk;
  public algod;

  constructor(configs: TxnsConfigs = {}) {
    super();
    this.setConfigs(configs);
  }

  public setConfigs(configs: TxnsConfigs) {
    super.setConfigs(configs);
    this.configs = merge({
      wait: true,
    }, this.configs, configs);
  }

  public init(stack: AlgoStack) {
    super.init(stack);
    
    this.algod = new algosdk.Algodv2(
      this.stack.configs.apiToken || '', 
      this.stack.configs.apiUrl, 
      this.stack.configs.apiPort || ''
    );

    this.client = stack.client;
    return this;
  }



  //
  // Prepare Txns
  // ----------------------------------------------
  private async getBaseParams () {
    const txn = await this.algod.getTransactionParams().do();
    return txn;
  }

  public async prepareTxn(params: Partial<TransactionParams>): Promise<TransactionParams> {
    const baseParams = await this.getBaseParams();
    return { ...baseParams, ...params }; 
  }
  public async prepareTxns(group: Partial<TransactionParams>[]): Promise<TransactionParams[]> {
    const baseParams = await this.getBaseParams();
    return group.map(params => ({ ...baseParams, ...params })); 
  }

  public makeTxn(params: TransactionParams) {
    return new algosdk.Transaction(params); 
  }
  public makeTxns(group: TransactionParams[]) {
    return group.map(params => 
      new algosdk.Transaction(params)
    ); 
  }



  //
  // Single Transaction
  // ----------------------------------------------
  public async sendTxn(params: Partial<TransactionParams>, configs: TxnsConfigs = this.configs): Promise<Record<string,any>|undefined> {
    
    try {
      const txnParams = await this.prepareTxn(params);
      const txn = this.makeTxn(txnParams);
      const signedTxn = await this.signTxns(txn);
      if (!signedTxn) return;
      const submited = await this.submitTxns(signedTxn, configs.wait);
      return submited;
    }
    catch (error) {
      console.dir(error);
    }
  }

  //
  // Grouped Transactions
  // ----------------------------------------------
  public async sendGroupedTxns(group: Partial<TransactionParams>[], configs: TxnsConfigs = this.configs): Promise<Record<string,any>|undefined>  {
    try {
      const paramsGroup = await this.prepareTxns(group);
      const txnsGroup = this.makeTxns(paramsGroup);
      const groupId = algosdk.computeGroupID(txnsGroup);
      txnsGroup.forEach(txn => {
        txn.group = groupId;
      });
      const signedTxns = await this.signTxns(txnsGroup);
      if (!signedTxns) return undefined;
      const submited = await this.submitTxns(signedTxns, configs.wait);
      return submited;
    }
    catch (error) {
      console.dir(error);
    }
  }

  //
  // Sequenced transactions
  // ----------------------------------------------
  public async sendSequencedTxns(sequence: Partial<TransactionParams>[]): Promise<Record<string,any>[]|undefined>  {
    try {
      const paramsSequence = await this.prepareTxns(sequence);
      const txnsSequence = this.makeTxns(paramsSequence);
    
      const signedTxns = await this.signTxns(txnsSequence);
      if (!signedTxns) return undefined;
      const confirmations: any[] = [];

      for(let i=0; i<signedTxns.length; i++) {
        const submited = await this.submitTxns(signedTxns[i], true);
        if (!submited.txId) break;
        confirmations.push( submited );
      }
      return confirmations;
    }
    catch (error) {
      console.dir(error);
    }
  }





  //
  // Sign
  // ----------------------------------------------
  public async signTxns (txns: Transaction|Transaction[]): Promise<Uint8Array[]|false> {
    if (!this.client) throw new Error('Client module is required');
    if (!this.client.connector) throw new Error('Client is not connected');
    if (!Array.isArray(txns)) txns = [txns];
    txns = txns.map(txn => txn instanceof Transaction ? txn : new Transaction(txn))
    const signedTxns = await this.client.connector.sign(txns);
    return signedTxns;  
  } 

  //
  // Send transaction
  // ----------------------------------------------
  public async submitTxns (signedTxns: Uint8Array|Uint8Array[], wait: boolean = this.configs.wait) {
    const response = await this.algod.sendRawTransaction(signedTxns).do();
    if (!response.txId) return;
    if (!wait) return camelcaseKeys(response, { deep: true });
    const confirmation = await this.wait(response.txId);
    return {
      ...confirmation,
      txId: response.txId,
    };
  }

  //
  // Wait for txn to be processed 
  // ----------------------------------------------
  public async wait (txnId, maxBlocks = 10): Promise<Record<string, any>> {
    const confirmation = await algosdk.waitForConfirmation(this.algod, txnId, maxBlocks);
    return camelcaseKeys(confirmation, { deep: true });
  }

}

