import axios from 'axios';
import camelcaseKeys from 'camelcase-keys';
import kebabcaseKeys from 'kebabcase-keys';
import AlgoStack from '../../index.js';
import Options from '../../utils/options.js';
import { Addon } from '../QueryAddons/index.js';
import { utfToBase64, objectValuesToString } from '../../helpers/encoding.js';
import type QueryAddons from '../QueryAddons/index.js';
import type { QueryParams, Payload } from './types.js';

/**
 * Query class
 * ==================================================
 */
export default class Query {
  protected options: Options;
  protected queryAddons?: QueryAddons; 
  constructor(forwarded: AlgoStack) {
    this.options = forwarded.options;
    this.queryAddons = forwarded.queryAddons;
  }

 
  /**
   * Query wrapper
   * ==================================================
   */
  private async indexerQuery(endpoint: string, params: QueryParams = {}, addons?: Addon[]) {
    const loop:boolean = params.limit === -1;
    if (loop) delete params.limit; 

    const encodedParams = this.encodeParams(params);
    const kebabcaseParams = kebabcaseKeys(encodedParams, { deep: true }); 

    let data: Payload = await this.fetchIndexer(endpoint, kebabcaseParams);
    
    if (loop) {
      while (data['next-token']) {
        const nextData: Payload = await this.fetchIndexer(
          endpoint, 
          { ...encodedParams, next: data['next-token']}
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
    data = camelcaseKeys(data, { deep: true }); 
    
    // Apply addons if necessary
    if (addons) {
      await this.queryAddons.apply(data, addons);
    }
    
    return data;
  }

  /**
   * Encode params
   * ==================================================
   */
  private encodeParams(params: QueryParams) {
    if (typeof params.notePrefix === 'string') {
      params.notePrefix = utfToBase64(params.notePrefix);
    }
    return params;
  }



  /**
   * Fetch data
   * ==================================================
   */
  private async fetchIndexer(endpoint: string, params: QueryParams = {}) {
    try {
      const stringifiedParams = objectValuesToString(params);
      const queryString: string = new URLSearchParams(stringifiedParams).toString();  
      const response = await axios.get(`${this.options.indexerUrl}${endpoint}?${queryString}`);
      return response.data;
    }
    catch (err: any) {
      return { error: err.toJSON()};
    }
  }


  /**
   * Lookup methods
   * ==================================================
   */
  // accounts
  private async account(accountId: string, params: QueryParams = {}, addons?: Addon[]) {
    return await this.indexerQuery(`/v2/accounts/${accountId}`, params, addons);
  }
  private async accountTransactions(accountId: string, params: QueryParams = {}, addons?: Addon[]) {
    return await this.indexerQuery(`/v2/accounts/${accountId}/transactions`, params, addons);
  }
  // app
  private async application(appId: number, params: QueryParams = {}, addons?: Addon[]) {
    return await this.indexerQuery(`/v2/applications/${appId}`, params, addons);
  }
  // asset
  private async asset(assetId: number, params: QueryParams = {}, addons?: Addon[]) {
    return await this.indexerQuery(`/v2/assets/${assetId}`, params, addons);
  }
  private async assetBalances(assetId: number, params: QueryParams = {}, addons?: Addon[]) {
    return await this.indexerQuery(`/v2/assets/${assetId}/balances`, params, addons);
  }
  private async assetTransactions(assetId: number, params: QueryParams = {}, addons?: Addon[]) {
    return await this.indexerQuery(`/v2/assets/${assetId}/transactions`, params, addons);
  }
  // block
  private async block(round: number, params: QueryParams = {}, addons?: Addon[]) {
    return await this.indexerQuery(`/v2/blocks/${round}`, params, addons);
  }
  // transaction
  private async transaction(id: string, params: QueryParams = {}, addons?: Addon[]) {
    return await this.indexerQuery(`/v2/transactions/${id}`, params, addons);
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


  /**
   * Search
   * ==================================================
   */
  private async accounts(params: QueryParams = {}, addons?: Addon[]) {
    return await this.indexerQuery(`/v2/accounts`, params, addons);
  }
  private async applications(params: QueryParams = {}, addons?: Addon[]) {
    return await this.indexerQuery(`/v2/applications`, params, addons);
  }
  private async assets(params: QueryParams = {}, addons?: Addon[]) {
    return await this.indexerQuery(`/v2/assets`, params, addons);
  }
  private async transactions(params: QueryParams = {}, addons?: Addon[]) {
    return await this.indexerQuery(`/v2/transactions`, params, addons);
  }

  // Wrap everything together
  public search = {
    accounts: this.accounts.bind(this),
    applications: this.applications.bind(this),
    assets: this.assets.bind(this),
    transactions: this.transactions.bind(this),
  }

}

