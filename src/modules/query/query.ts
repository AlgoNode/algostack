import axios from 'axios';
import { pRateLimit } from 'p-ratelimit';
import camelcaseKeys from 'camelcase-keys';
import kebabcaseKeys from 'kebabcase-keys';
import AlgoStack from '../../index.js';
import options from '../../utils/options.js';
import { Addon } from '../addons/index.js';
import { utf8ToB64, objectValuesToString } from '../../helpers/encoding.js';
import type Cache from '../cache/index.js';
import type Addons from '../addons/index.js';
import type { QueryParams, Payload } from './types.js';

/**
 * Query class
 * ==================================================
 */
export default class Query {
  protected addons?: Addons;
  protected cache?: Cache; 
  protected rateLimit: <T>(fn: () => Promise<T>) => Promise<T>;
  constructor(forwarded: AlgoStack) {
    this.cache = forwarded.cache;
    this.addons = forwarded.addons;
    this.rateLimit = pRateLimit({
      interval: 1000,
      rate: 50, 
    });
  }

 
  /**
   * Query wrapper
   * ==================================================
   */
  private async indexerQuery(store: string|null, id: string|number|null, endpoint: string, params: QueryParams = {}, addons?: Addon[]) {
    let data: Payload;
    params = { ...params }; 
     
    // get cached data
    if (this.cache && store && !params.refreshCache) {
      const cached = await this.cache.find(store, { id, params });
      if (cached) {
        data = cached.data
        if (addons) await this.addons.apply(data, addons);
        return data;
      }
    }
    
    const url = id ? endpoint.replace(':id', String(id)) : endpoint;
    const loop:boolean = params.limit === -1;
    if (loop) delete params.limit; 
    if (params.refreshCache !== undefined) delete params.refreshCache;

    const cleanParams = this.cleanParams(params)
    const encodedParams = this.encodeParams(cleanParams);
    const kebabcaseParams = kebabcaseKeys(encodedParams, { deep: true }); 

    data = await this.fetchIndexer(url, kebabcaseParams);
    
    // Loop
    if (loop) {
      while (data['next-token']) {
        const nextData: Payload = await this.fetchIndexer(
          url, 
          { ...kebabcaseParams, next: data['next-token']}
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
    
    // cache result
    if (this.cache && store && !data.error) {
      await this.cache.save(store, data, { id, params });
    }

    // Apply addons if necessary
    if (addons) {
      await this.addons.apply(data, addons);
    }
    
    return data;
  }


  /**
   * Clean params
   * ==================================================
   */
   private cleanParams(params: QueryParams) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined) delete params[key];
    });
    return params;
  }


  /**
   * Encode params
   * ==================================================
   */
  private encodeParams(params: QueryParams) {
    if (typeof params.notePrefix === 'string') {
      params.notePrefix = utf8ToB64(params.notePrefix);
    }
    return params;
  }



  /**
   * Fetch data
   * ==================================================
   */
  private async fetchIndexer(endpoint: string, params: QueryParams = {}) {
    try {
      if (endpoint.indexOf(':id') > -1) {
        return { error: { 
          message: 'Endpoint is invalid',
          url: endpoint
        } } 
      }
      const stringifiedParams = objectValuesToString(params);
      const queryString: string = new URLSearchParams(stringifiedParams).toString();  
      const response = await this.rateLimit(
        () => axios.get(`${options.indexerUrl}${endpoint}?${queryString}`)
      );
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
    return await this.indexerQuery('account', accountId, `/v2/accounts/:id`, params, addons);
  }
  private async accountTransactions(accountId: string, params: QueryParams = {}, addons?: Addon[]) {
    return await this.indexerQuery('accountTransactions', accountId, `/v2/accounts/:id/transactions`, params, addons);
  }
  // app
  private async application(appId: number, params: QueryParams = {}, addons?: Addon[]) {
    return await this.indexerQuery('application', appId, `/v2/applications/:id`, params, addons);
  }
  // asset
  private async asset(assetId: number, params: QueryParams = {}, addons?: Addon[]) {
    return await this.indexerQuery('asset', assetId, `/v2/assets/:id`, params, addons);
  }
  private async assetBalances(assetId: number, params: QueryParams = {}, addons?: Addon[]) {
    return await this.indexerQuery('assetBalances', assetId, `/v2/assets/:id/balances`, params, addons);
  }
  private async assetTransactions(assetId: number, params: QueryParams = {}, addons?: Addon[]) {
    return await this.indexerQuery('assetTransactions', assetId, `/v2/assets/:id/transactions`, params, addons);
  }
  // block
  private async block(round: number, params: QueryParams = {}, addons?: Addon[]) {
    return await this.indexerQuery('block', round, `/v2/blocks/:id`, params, addons);
  }
  // transaction
  private async transaction(id: string, params: QueryParams = {}, addons?: Addon[]) {
    return await this.indexerQuery('txn', id, `/v2/transactions/:id`, params, addons);
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
    return await this.indexerQuery('accounts', null, `/v2/accounts`, params, addons);
  }
  private async applications(params: QueryParams = {}, addons?: Addon[]) {
    return await this.indexerQuery('applications', null, `/v2/applications`, params, addons);
  }
  private async assets(params: QueryParams = {}, addons?: Addon[]) {
    return await this.indexerQuery('assets', null, `/v2/assets`, params, addons);
  }
  private async transactions(params: QueryParams = {}, addons?: Addon[]) {
    return await this.indexerQuery('txns', null, `/v2/transactions`, params, addons);
  }

  // Wrap everything together
  public search = {
    accounts: this.accounts.bind(this),
    applications: this.applications.bind(this),
    assets: this.assets.bind(this),
    transactions: this.transactions.bind(this),
  }


  /**
  * Custom
  * ==================================================
  */
  public async custom(endpoint: string, params: QueryParams = {}, addons?: Addon[]) {
    return await this.indexerQuery(null , null, endpoint, params, addons);
  }

}

