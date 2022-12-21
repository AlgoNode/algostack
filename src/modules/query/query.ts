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
  private async indexerQuery(
    endpoint: string, 
    store: string|null, 
    queryParams: QueryParams = {}, 
    addons?: Addon[]
  ) {
    let data: Payload;
    // get cached data
    if (this.cache && store && !queryParams.refreshCache && !queryParams.noCache) {
      const cached = await this.cache.find(store, { params: queryParams });
      if (cached) {
        data = cached.data
        if (addons) await this.addons.apply(data, addons);
        return data;
      }
    }
    
    let { params, url } = this.mergeUrlAndParams(endpoint, queryParams);
    
    const loop:boolean = params.limit === -1;
    if (loop) delete params.limit; 
    if (params.refreshCache !== undefined) delete params.refreshCache;
    if (params.noCache !== undefined) delete params.noCache;


    const cleanParams = this.cleanParams(params)
    const encodedParams = this.encodeParams(cleanParams);
    const kebabcaseParams = kebabcaseKeys(encodedParams, { deep: true }); 

    data = await this.fetch(`${options.indexerUrl}${url}`, kebabcaseParams);
    // Loop
    if (loop) {
      while (data['next-token']) {
        const nextData: Payload = await this.fetch(
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
    if (this.cache && store && !queryParams.noCache && !data.error) {
      await this.cache.save(store, data, { params: queryParams });
    }

    // Apply addons if necessary
    if (addons) await this.addons.apply(data, addons);
  
    return data;
  }





  /**
  * 
  * ==================================================
  */
  private mergeUrlAndParams(url: string, params: Record<string, any>) {
    params = {...params};
    Object.entries(params)
      .forEach(([key,value]) => {
        if (url.indexOf('/:'+ key) > -1) {
          url = url.replace(':'+ key, value);
          delete params[key];
        }
      });
    return  { url, params };
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
  private async fetch(endpoint: string, params: QueryParams = {}) {
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
        () => axios.get(`${endpoint}?${queryString}`)
      );
      return response.data;
    }
    catch (err: any) {
      return { error: err.toJSON()};
    }
  }



  /**
  * Health
  * ==================================================
  */
  public async health() {
    return this.fetch(`${options.indexerUrl}/health`);
  }


  /**
  * Lookup methods
  * ==================================================
  */
  // accounts
  private async account(accountId: string, params: QueryParams = {}, addons?: Addon[]) {
    return await this.indexerQuery( `/v2/accounts/:id`, 'account', { ...params, id: accountId }, addons);
  }
  private async accountTransactions(accountId: string, params: QueryParams = {}, addons?: Addon[]) {
    return await this.indexerQuery( `/v2/accounts/:id/transactions`, 'accountTransactions', { ...params, id: accountId }, addons);
  }
  private async accountAssets(accountId: string, params: QueryParams = {}, addons?: Addon[]) {
    return await this.indexerQuery( `/v2/accounts/:id/assets`, 'accountAssets', { ...params, id: accountId }, addons);
  }
  // app
  private async application(appId: number, params: QueryParams = {}, addons?: Addon[]) {
    return await this.indexerQuery( `/v2/applications/:id`, 'application', { ...params, id: appId }, addons);
  }
  // asset
  private async asset(assetId: number, params: QueryParams = {}, addons?: Addon[]) {
    return await this.indexerQuery( `/v2/assets/:id`, 'asset', { ...params, id: assetId }, addons);
  }
  private async assetBalances(assetId: number, params: QueryParams = {}, addons?: Addon[]) {
    return await this.indexerQuery( `/v2/assets/:id/balances`, 'assetBalances', { ...params, id: assetId }, addons);
  }
  private async assetTransactions(assetId: number, params: QueryParams = {}, addons?: Addon[]) {
    return await this.indexerQuery( `/v2/assets/:id/transactions`, 'assetTransactions', { ...params, id: assetId }, addons);
  }
  // block
  private async block(round: number, params: QueryParams = {}, addons?: Addon[]) {
    return await this.indexerQuery( `/v2/blocks/:id`, 'block', { ...params, id: round }, addons);
  }
  // transaction
  private async transaction(id: string, params: QueryParams = {}, addons?: Addon[]) {
    return await this.indexerQuery( `/v2/transactions/:id`, 'txn', { ...params, id: id }, addons);
  }

  // Wrap everything together
  public lookup = {
    account: this.account.bind(this),
    accountTransactions: this.accountTransactions.bind(this),
    accountAssets: this.accountAssets.bind(this),
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
    return await this.indexerQuery( `/v2/accounts`, 'accounts', params, addons);
  }
  private async applications(params: QueryParams = {}, addons?: Addon[]) {
    return await this.indexerQuery( `/v2/applications`, 'applications', params, addons);
  }
  private async assets(params: QueryParams = {}, addons?: Addon[]) {
    return await this.indexerQuery( `/v2/assets`, 'assets', params, addons);
  }
  private async transactions(params: QueryParams = {}, addons?: Addon[]) {
    return await this.indexerQuery( `/v2/transactions`, 'txns', params, addons);
  }

  // Wrap everything together
  public search = {
    accounts: this.accounts.bind(this),
    applications: this.applications.bind(this),
    assets: this.assets.bind(this),
    transactions: this.transactions.bind(this),
  }



  /**
  * Node queries (Algod API)
  * ==================================================
  */
 private async 



  /**
  * Custom queries
  * ==================================================
  */
  public async custom(
    endpoint: string, 
    store: string|null, 
    queryParams: QueryParams = {}
  ) {
    let data: Payload;
    
    // get cached data
    if (this.cache && store && !queryParams.refreshCache && !queryParams.noCache) {
      const cached = await this.cache.find(store, { params: queryParams });
      if (cached) {
        data = cached.data
        return data;
      }
    }
    
    let { params, url } = this.mergeUrlAndParams(endpoint, queryParams);
    if (params.refreshCache !== undefined) delete params.refreshCache;
    if (params.noCache !== undefined) delete params.noCache;

    // const kebabcaseParams = kebabcaseKeys(params, { deep: true }); 
    data = await this.fetch(url, params);
    // data = camelcaseKeys(data, { deep: true }); 
    
    // cache result
    if (this.cache && store && !queryParams.noCache && !data.error) {
      await this.cache.save(store, data, { params: queryParams });
    }
  
    return data;
  }



}

