import axios from 'axios';
import AlgoStack from '../../index.js';
import Convert from '../../utils/convert.js';
import Options from '../../utils/options.js';
import type Addons from '../Addons/index.js';
import type { QueryParams, Payload } from './types.js';

//
// QUERY class
// ----------------------------------------------
export default class Query {
  protected options: Options;
  protected convert: Convert;
  protected addons?: Addons; 
  constructor(forwarded: AlgoStack) {
    this.options = forwarded.options;
    this.convert = forwarded.convert;
    this.addons = forwarded.addons;
  }

 
  //
  // Query wrapper
  // ----------------------------------------------
  private async indexerQuery(endpoint: string, params: QueryParams = {}) {
    const loop:boolean = params.limit === -1;
    if (loop) delete params.limit; 

    const convertedParams = this.convert.fromUserCase(params); 
    let data: Payload = await this.fetchIndexer(endpoint, convertedParams);
    
    if (loop) {
      while (data['next-token']) {
        const nextData: Payload = await this.fetchIndexer(
          endpoint, 
          { ...convertedParams, next: data['next-token']}
        );
        delete data['next-token'];
        // merge arrays, including possible new 'next-token'
        Object.entries(nextData).forEach(([key, value]) => {
          if (value.length !== undefined && data[key])
            data[key] = [ ...data[key], ...value ];
          else 
            data[key] = value;
        });
      }
    }

    // convert to camelcase for standarized addons
    data = this.convert.convertCase(data, 'camelcase'); 
    
    // Apply addons if necessary
    if (this.addons && this.options.enableAddons) {
      await this.addons.applyOn(data);
    }
    
    if (this.options.convertCase !== 'camelcase') {
      data = this.convert.toUserCase(data); 
    }

    return data;
  }

  
  //
  // Fetch data
  // ----------------------------------------------
  private async fetchIndexer(endpoint: string, params: QueryParams = {}) {
    try {
      const stringifiedParams = this.convert.objectValuesToString(params);
      const queryString: string = new URLSearchParams(stringifiedParams).toString();  
      const response = await axios.get(`${this.options.indexerUrl}${endpoint}?${queryString}`);
      return response.data;
    }
    catch (err: any) {
      return { error: err.toJSON()};
    }
  }


  //
  // Lookup methods
  // ----------------------------------------------
  // accounts
  private async account(accountId: string, params: QueryParams = {}) {
    return await this.indexerQuery(`/v2/accounts/${accountId}`, params);
  }
  private async accountTransactions(accountId: string, params: QueryParams = {}) {
    return await this.indexerQuery(`/v2/accounts/${accountId}/transactions`, params);
  }
  // app
  private async application(appId: number, params: QueryParams = {}) {
    return await this.indexerQuery(`/v2/applications/${appId}`, params);
  }
  // asset
  private async asset(assetId: number, params: QueryParams = {}) {
    return await this.indexerQuery(`/v2/assets/${assetId}`, params);
  }
  private async assetBalances(assetId: number, params: QueryParams = {}) {
    return await this.indexerQuery(`/v2/assets/${assetId}/balances`, params);
  }
  private async assetTransactions(assetId: number, params: QueryParams = {}) {
    return await this.indexerQuery(`/v2/assets/${assetId}/transactions`, params);
  }
  // block
  private async block(round: number, params: QueryParams = {}) {
    return await this.indexerQuery(`/v2/blocks/${round}`, params);
  }
  // transaction
  private async transaction(id: string, params: QueryParams = {}) {
    return await this.indexerQuery(`/v2/transactions/${id}`, params);
  }

  // Wrap everything together
  public lookup = {
    account: this.account.bind(this),
    accountTransactions: this.accountTransactions.bind(this),
    application: this.application.bind(this),
    asset: this.asset.bind(this),
    assetBalances: this.assetBalances.bind(this),
    assetTransactions: this.assetTransactions.bind(this),
    block: this.block.bind(this),
    transaction: this.transaction.bind(this),
  }


  //
  // Search
  // ---------------------------------------------
  private async accounts(params: QueryParams = {}) {
    return await this.indexerQuery(`/v2/accounts`, params);
  }
  private async applications(params: QueryParams = {}) {
    return await this.indexerQuery(`/v2/applications`, params);
  }
  private async assets(params: QueryParams = {}) {
    return await this.indexerQuery(`/v2/assets`, params);
  }
  private async transactions(params: QueryParams = {}) {
    return await this.indexerQuery(`/v2/transactions`, params);
  }

  // Wrap everything together
  public search = {
    accounts: this.accounts.bind(this),
    applications: this.applications.bind(this),
    assets: this.assets.bind(this),
    transactions: this.transactions.bind(this),
  }

}

