import type Cache from '../cache/index.js';
import type Addons from '../addons/index.js';
import type { QueryParams, Payload, QueryOptions } from './types.js';
import { Buffer } from 'buffer'
import { pRateLimit } from 'p-ratelimit';
import { Addon } from '../../enums.js';
import { utf8ToB64 } from '../../helpers/encoding.js';
import { ApiUrl } from './enums.js';
import camelcaseKeys from 'camelcase-keys';
import kebabcaseKeys from 'kebabcase-keys';
import AlgoStack from '../../index.js';
import options from '../../utils/options.js';
import axios, { AxiosHeaders } from 'axios';

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
      concurrency: 25,
    });
  }

 
  /**
  * Query wrapper
  * ==================================================
  */
  private async query(queryOptions: QueryOptions) {
    const {
      base = ApiUrl.INDEXER,
      endpoint, 
      store, 
      queryParams = {}, 
      addons,
    } = queryOptions
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

    data = await this.fetch(`${options[base]}${url}`, kebabcaseParams);
    // Loop
    if (loop) {
      while (data['next-token']) {
        const nextData: Payload = await this.fetch(
          `${options[base]}${url}`, 
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
  private async fetch(url: string, params: QueryParams = {}) {
    try {
      if (url.indexOf(':id') > -1) {
        return { error: { 
          url,
          message: 'Url is invalid',
        } } 
      }
      const method: string = params.method 
        ? String(params.method).toUpperCase()
        : 'GET';
      if (params.method) delete params.method;
      
      const headers = params.headers as AxiosHeaders;
      if (params.headers) delete params.headers

      const data = params?.data || params;

      const response = await this.rateLimit(
        () => axios({
          url,
          method,
          headers,
          params: method === 'GET' ? data : undefined, 
          data: method !== 'GET' ? data : undefined,
        })
      );
      return response.data;
    }
    catch (err: any) {
      return { error: err.toJSON ? err.toJSON() : err};
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
  private async indexerAccount(accountId: string, params: QueryParams = {}, addons?: Addon[]) {
    return await this.query({
      endpoint: `/v2/accounts/:id`, 
      store: 'indexer/account', 
      queryParams: { ...params, id: accountId }, 
      addons,
    });
  }
  private async indexerAccountTransactions(accountId: string, params: QueryParams = {}, addons?: Addon[]) {
    return await this.query({
      endpoint: `/v2/accounts/:id/transactions`, 
      store: 'indexer/accountTransactions', 
      queryParams: { ...params, id: accountId }, 
      addons,
    });
  }
  private async indexerAccountAssets(accountId: string, params: QueryParams = {}, addons?: Addon[]) {
    return await this.query({
      endpoint: `/v2/accounts/:id/assets`, 
      store: 'indexer/accountAssets', 
      queryParams: { ...params, id: accountId }, 
      addons,
    });
  }
  private async indexerAccountApplications(accountId: string, params: QueryParams = {}, addons?: Addon[]) {
    return await this.query({
      endpoint: `/v2/accounts/:id/apps-local-state`, 
      store: 'indexer/accountApplications', 
      queryParams: { ...params, id: accountId }, 
      addons,
    });
  }
  // app
  private async indexerApplication(appId: number, params: QueryParams = {}, addons?: Addon[]) {
    return await this.query({
      endpoint: `/v2/applications/:id`, 
      store: 'indexer/application', 
      queryParams: { ...params, id: appId }, 
      addons,
    });
  }
  private async indexerApplicationBox(appId: number, boxName: string, params: QueryParams = {}, addons?: Addon[]) {
    return await this.query({
      endpoint: `/v2/applications/:id/boxes`, 
      store: 'indexer/applicationBoxes', 
      queryParams: { ...params, id: appId, name: `b64:${boxName}` }, 
      addons,
    });
  }
  private async indexerApplicationBoxes(appId: number, params: QueryParams = {}, addons?: Addon[]) {
    return await this.query({
      endpoint: `/v2/applications/:id/boxes`, 
      store: 'indexer/applicationBoxes', 
      queryParams: { ...params, id: appId }, 
      addons,
    });
  }
  // asset
  private async indexerAsset(assetId: number, params: QueryParams = {}, addons?: Addon[]) {
    return await this.query({
      endpoint: `/v2/assets/:id`, 
      store: 'indexer/asset', 
      queryParams: { ...params, id: assetId }, 
      addons,
    });
  }
  private async indexerAssetBalances(assetId: number, params: QueryParams = {}, addons?: Addon[]) {
    return await this.query({
      endpoint: `/v2/assets/:id/balances`, 
      store: 'indexer/assetBalances', 
      queryParams: { ...params, id: assetId }, 
      addons,
    });
  }
  private async indexerAssetTransactions(assetId: number, params: QueryParams = {}, addons?: Addon[]) {
    return await this.query({
      endpoint: `/v2/assets/:id/transactions`, 
      store: 'indexer/assetTransactions', 
      queryParams: { ...params, id: assetId }, 
      addons,
    });
  }
  // block
  private async indexerBlock(round: number, params: QueryParams = {}, addons?: Addon[]) {
    return await this.query({
      endpoint: `/v2/blocks/:id`, 
      store: 'indexer/block', 
      queryParams: { ...params, id: round }, 
      addons,
    });
  }
  // transaction
  private async indexerTransaction(id: string, params: QueryParams = {}, addons?: Addon[]) {
    return await this.query({
      endpoint: `/v2/transactions/:id`, 
      store: 'indexer/txn', 
      queryParams: { ...params, id: id }, 
      addons,
    });
  }

  


  /**
  * Node queries (Algod API)
  * ==================================================
  */
  private async nodeAccount(accountId: string, params: QueryParams = {}, addons?: Addon[]) {
    return await this.query({
      base: ApiUrl.NODE,
      endpoint: `/v2/accounts/:id`, 
      store: 'node/account', 
      queryParams: { ...params, id: accountId }, 
      addons,
    });
  }
  private async nodeAccountApplication(accountId: string, appId: number, params: QueryParams = {}, addons?: Addon[]) {
    return await this.query({
      base: ApiUrl.NODE,
      endpoint: `/v2/accounts/:id/applications/:appId`, 
      store: 'node/accountApplication', 
      queryParams: { ...params, id: accountId, appId, }, 
      addons,
    });
  }
  private async nodeAccountAsset(accountId: string, assetId: number, params: QueryParams = {}, addons?: Addon[]) {
    return await this.query({
      base: ApiUrl.NODE,
      endpoint: `/v2/accounts/:id/assets/:assetId`, 
      store: 'node/accountAsset', 
      queryParams: { ...params, id: accountId, assetId, }, 
      addons,
    });
  }
  private async nodeBlock(round: number, params: QueryParams = {}, addons?: Addon[]) {
    return await this.query({
      base: ApiUrl.NODE,
      endpoint: `/v2/blocks/:id`, 
      store: 'node/block', 
      queryParams: { ...params, id: round }, 
      addons,
    });
  }
  private async nodeDisassembleTeal(b64: string) {
    if (!b64?.length) return undefined;
    const programBuffer = Buffer.from(b64, 'base64');
    const response = await this.custom(`${options[ApiUrl.NODE]}/v2/teal/disassemble`, 'node/teal', {
      method: 'POST',
      refreshCache: true,
      headers: { 'Content-Type': 'application/x-binary' },
      data: programBuffer,
    });
    return response?.result;
  }


  // Wrap everything together
  public lookup = {
    account: this.indexerAccount.bind(this),
    accountAssets: this.indexerAccountAssets.bind(this),
    accountApplications: this.indexerAccountApplications.bind(this),
    accountTransactions: this.indexerAccountTransactions.bind(this),
    application: this.indexerApplication.bind(this),
    applicationBox: this.indexerApplicationBox.bind(this),
    applicationBoxes: this.indexerApplicationBoxes.bind(this),
    asset: this.indexerAsset.bind(this),
    assetBalances: this.indexerAssetBalances.bind(this),
    assetTransactions: this.indexerAssetTransactions.bind(this),
    block: this.indexerBlock.bind(this),
    transaction: this.indexerTransaction.bind(this),
    
    node: {
      account: this.nodeAccount.bind(this),
      accountApplicaction: this.nodeAccountApplication.bind(this),
      accountAsset: this.nodeAccountAsset.bind(this),
      block: this.nodeBlock.bind(this),
      dissableTeal: this.nodeDisassembleTeal.bind(this),
    }
  }


  /**
  * Search
  * ==================================================
  */
  private async accounts(params: QueryParams = {}, addons?: Addon[]) {
    return await this.query({
      endpoint: `/v2/accounts`, 
      store: 'indexer/accounts', 
      queryParams: params, 
      addons,
    });
  }
  private async applications(params: QueryParams = {}, addons?: Addon[]) {
    return await this.query({
      endpoint: `/v2/applications`, 
      store: 'indexer/applications', 
      queryParams: params, 
      addons,
    });
  }
  private async assets(params: QueryParams = {}, addons?: Addon[]) {
    return await this.query({
      endpoint: `/v2/assets`, 
      store: 'indexer/assets', 
      queryParams: params, 
      addons,
    });
  }
  private async transactions(params: QueryParams = {}, addons?: Addon[]) {
    return await this.query({
      endpoint: `/v2/transactions`, 
      store: 'indexer/txns', 
      queryParams: params, 
      addons,
    });
  }

  // Wrap everything together
  public search = {
    accounts: this.accounts.bind(this),
    applications: this.applications.bind(this),
    assets: this.assets.bind(this),
    transactions: this.transactions.bind(this),
  }







  /**
  * Custom queries
  * ==================================================
  */
  public async custom(
    apiUrl: string, 
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
    
    let { params, url } = this.mergeUrlAndParams(apiUrl, queryParams);
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

