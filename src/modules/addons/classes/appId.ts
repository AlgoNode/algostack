import type Addons from '../addons.js';
import type Query from '../../query/index.js';
import { Payload } from '../../query/index.js';
import BaseRunner from './_base.js';
import algosdk from 'algosdk';

export default class Arcs extends BaseRunner {
  protected query: Query;

  constructor (data: Payload, forwarded: Addons) {
    super(data, ['account', 'accounts'], 'appId', undefined);
    this.query = forwarded?.query;
  }

  async accounts(accounts: Payload) {
    if (!Array.isArray(accounts)) return
    for (let i=0; i<accounts.length; i++) {
      const account = accounts[i];
      await this.account(account)
    }
  }
  
  async account(account: Payload) {
    if (account.sigType || !account.createdAtRound) return;
    const { address } = account;

    // try finding app id from the latest appl transactions
    const { transactions: txns } = await this.query.lookup.accountTransactions(address, {
      txType: 'appl',
      limit: 100,
    });
    const appl = txns.find(txn => algosdk.getApplicationAddress(txn.applicationTransaction.applicationId) === address)
    if (appl) {
      this.save(account, appl.applicationTransaction.applicationId);
      return;
    }
  } 
}
