import type Cache from '../cache/index.js';
import type { QueryParams, Payload, QueryOptions, FilterFn, AddonFn, Addons, QueryConfigs } from './types.js';
import { Buffer } from 'buffer'
import { pRateLimit } from 'p-ratelimit';
import { utf8ToB64 } from '../../helpers/encoding.js';
import { ApiUrl } from './enums.js';
import { BaseModule } from '../_baseModule.js';
import camelcaseKeys from 'camelcase-keys';
import kebabcaseKeys from 'kebabcase-keys';
import AlgoStack from '../../index.js';
import axios, { AxiosHeaders } from 'axios';

/**
 * Query class
 * ==================================================
 */
export default class Query extends BaseModule {
  protected cache?: Cache; 
  protected rateLimit: <T>(fn: () => Promise<T>) => Promise<T>;
  
  constructor() {
    super();
    this.rateLimit = pRateLimit({
      interval: 1000,
      rate: 50,
      concurrency: 25,
    });
  }
  
  public init(stack: AlgoStack) {
    super.init(stack);
    this.cache = stack.cache;
    return this;
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
      params: originalParams = {}, 
    } = queryOptions
    let data: Payload;

    // get cached data
    if (this.cache && store && !originalParams.refreshCache && !originalParams.noCache) {
      const cached = await this.cache.find(store, { params: originalParams });
      if (cached) {
        data = cached.data
        return data;
      }
    }
    
    let { params, url } = this.mergeUrlAndParams(endpoint, originalParams);
    
    const addons = params.addons as Addons|undefined;
    if (addons) delete params.addons;
    const filter = params.filter;
    if (filter) delete params.filter;
    
    if (params.limit === -1) delete params.limit; 
    if (params.refreshCache !== undefined) delete params.refreshCache;
    if (params.noCache !== undefined) delete params.noCache;

    const cleanParams = this.cleanParams(params)
    const encodedParams = this.encodeParams(cleanParams);
    const kebabcaseParams = kebabcaseKeys(encodedParams, { deep: true }); 

    data = await this.fetch(`${this.stack.configs[base]}${url}`, kebabcaseParams);
    data = camelcaseKeys(data, { deep: true }); 
    
    if (addons) await this.applyAddons(data, addons);
    if (filter) data = this.applyFilter(data, filter);
    
    // Loop
    let i = 0;
    while (this.shouldFetchNext(data, originalParams) && i < 20) {
      i++;
      let nextData: Payload = await this.fetch(
        `${this.stack.configs[base]}${url}`, 
        { ...kebabcaseParams, next: data.nextToken}
      );
      delete data.nextToken;
      nextData = camelcaseKeys(nextData, { deep: true }); 
      if (addons) await this.applyAddons(nextData, addons);
      if (filter) nextData = this.applyFilter(nextData, filter);
      // merge arrays, including possible new 'next-token'
      Object.entries(nextData).forEach(([key, value]) => {
        if (Array.isArray(value) && data[key])
          data[key] = [ ...data[key], ...value ];
        else 
          data[key] = value;
      });
    }

    
    // cache result
    if (this.cache && store && !originalParams.noCache && !data.error) {
      // console.log('CACHING')
      await this.cache.save(store, data, { params: originalParams });
    }
    return data;
  }


  /**
  * Iterate throught results
  * ==================================================
  */
  private async applyAddon(data: Payload|Payload[], addons: AddonFn[]) {
    if (!Array.isArray(data)) data = [data];
    await Promise.all(
      data.reduce((promises, dataset) => ([
        ...promises,
        ...addons.map(addon => addon(dataset)),
      ]),[])
    )
  }
  private async applyAddons(data: Payload|Payload[], addons: Addons ) {
    // addons are applied to all data
    if (Array.isArray(addons)) {
      await this.applyAddon(data, addons as AddonFn[]);
      return;
    }
    // addons are applied to specified props
    const addonsKeys = Object.keys(addons);
    const dataKeys = Object.keys(data)
      .filter(key => addonsKeys.includes(key));
    if (!dataKeys.length) return;
    await Promise.all( 
      dataKeys.map(key => this.applyAddon(data[key], addons[key]))
    );
  }
  


  private applyFilter(data: Payload|Payload[], filterFn: FilterFn) {
    if (Array.isArray(data)) return data.filter(filterFn);
    Object.entries((data)).forEach(([key, value]) => {
      if (Array.isArray(value)) data[key] = value.filter(filterFn);
    });
    return data;
  }

  private getResultsQty(data: Payload|Payload[]) {
    if (Array.isArray(data)) {
      return data.length;
    }    
    return Object.values(data)
      .filter(value => Array.isArray(value))
      .reduce((total, value) => (Math.max(value.length, total)),  0);
  }


  /**
  * 
  * ==================================================
  */
  private shouldFetchNext(data: Payload, params: QueryParams) {
    if (params.limit === -1 && data['next-token']) return true;
    if (params.filter 
      && params.limit 
      && data['next-token']
      && this.getResultsQty(data) < params.limit
    ) return true;
    return false;
  }

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
    return this.fetch(`${this.stack.configs.indexerUrl}/health`);
  }


  /**
  * Lookup methods
  * ==================================================
  */
  // accounts
  private async indexerAccount(accountId: string, params: QueryParams = {}) {
    return await this.query({
      endpoint: `/v2/accounts/:id`, 
      store: 'indexer/account', 
      params: { ...params, id: accountId },
    });
  }
  private async indexerAccountTransactions(accountId: string, params: QueryParams = {}) {
    return await this.query({
      endpoint: `/v2/accounts/:id/transactions`, 
      store: 'indexer/accountTransactions', 
      params: { ...params, id: accountId },
    });
  }
  private async indexerAccountAssets(accountId: string, params: QueryParams = {}) {
    return await this.query({
      endpoint: `/v2/accounts/:id/assets`, 
      store: 'indexer/accountAssets', 
      params: { ...params, id: accountId },
    });
  }
  private async indexerAccountApplications(accountId: string, params: QueryParams = {}) {
    return await this.query({
      endpoint: `/v2/accounts/:id/apps-local-state`, 
      store: 'indexer/accountApplications', 
      params: { ...params, id: accountId },
    });
  }
  // app
  private async indexerApplication(appId: number, params: QueryParams = {}) {
    return await this.query({
      endpoint: `/v2/applications/:id`, 
      store: 'indexer/application', 
      params: { ...params, id: appId },
    });
  }
  private async indexerApplicationBox(appId: number, boxName: string, params: QueryParams = {}) {
    return await this.query({
      endpoint: `/v2/applications/:id/boxes`, 
      store: 'indexer/applicationBoxes', 
      params: { ...params, id: appId, name: `b64:${boxName}` },
    });
  }
  private async indexerApplicationBoxes(appId: number, params: QueryParams = {}) {
    return await this.query({
      endpoint: `/v2/applications/:id/boxes`, 
      store: 'indexer/applicationBoxes', 
      params: { ...params, id: appId },
    });
  }
  // asset
  private async indexerAsset(assetId: number, params: QueryParams = {}) {
    return await this.query({
      endpoint: `/v2/assets/:id`, 
      store: 'indexer/asset', 
      params: { ...params, id: assetId },
    });
  }
  private async indexerAssetBalances(assetId: number, params: QueryParams = {}) {
    return await this.query({
      endpoint: `/v2/assets/:id/balances`, 
      store: 'indexer/assetBalances', 
      params: { ...params, id: assetId },
    });
  }
  private async indexerAssetTransactions(assetId: number, params: QueryParams = {}) {
    return await this.query({
      endpoint: `/v2/assets/:id/transactions`, 
      store: 'indexer/assetTransactions', 
      params: { ...params, id: assetId },
    });
  }
  // block
  private async indexerBlock(round: number, params: QueryParams = {}) {
    return await this.query({
      endpoint: `/v2/blocks/:id`, 
      store: 'indexer/block', 
      params: { ...params, id: round },
    });
  }
  // transaction
  private async indexerTransaction(id: string, params: QueryParams = {}) {
    return await this.query({
      endpoint: `/v2/transactions/:id`, 
      store: 'indexer/txn', 
      params: { ...params, id: id },
    });
  }

  


  /**
  * Node queries (Algod API)
  * ==================================================
  */
  private async nodeAccount(accountId: string, params: QueryParams = {}) {
    return await this.query({
      base: ApiUrl.NODE,
      endpoint: `/v2/accounts/:id`, 
      store: 'node/account', 
      params: { ...params, id: accountId },
    });
  }
  private async nodeAccountApplication(accountId: string, appId: number, params: QueryParams = {}) {
    return await this.query({
      base: ApiUrl.NODE,
      endpoint: `/v2/accounts/:id/applications/:appId`, 
      store: 'node/accountApplication', 
      params: { ...params, id: accountId, appId, },
    });
  }
  private async nodeAccountAsset(accountId: string, assetId: number, params: QueryParams = {}) {
    return await this.query({
      base: ApiUrl.NODE,
      endpoint: `/v2/accounts/:id/assets/:assetId`, 
      store: 'node/accountAsset', 
      params: { ...params, id: accountId, assetId, },
    });
  }
  private async nodeBlock(round: number, params: QueryParams = {}) {
    return await this.query({
      base: ApiUrl.NODE,
      endpoint: `/v2/blocks/:id`, 
      store: 'node/block', 
      params: { ...params, id: round },
    });
  }
  private async nodeDisassembleTeal(b64: string) {
    if (!b64?.length) return undefined;
    const programBuffer = Buffer.from(b64, 'base64');
    const response = await this.custom(`${this.stack.configs[ApiUrl.NODE]}/v2/teal/disassemble`, 'node/teal', {
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
  private async accounts(params: QueryParams = {}) {
    return await this.query({
      endpoint: `/v2/accounts`, 
      store: 'indexer/accounts', 
      params,
    });
  }
  private async applications(params: QueryParams = {}) {
    return await this.query({
      endpoint: `/v2/applications`, 
      store: 'indexer/applications', 
      params,
    });
  }
  private async assets(params: QueryParams = {}) {
    return await this.query({
      endpoint: `/v2/assets`, 
      store: 'indexer/assets', 
      params,
    });
  }
  private async transactions(params: QueryParams = {}) {
    return await this.query({
      endpoint: `/v2/transactions`, 
      store: 'indexer/txns', 
      params,
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
    originalParams: QueryParams = {}
  ) {
    let data: Payload;
    // get cached data
    if (this.cache && store && !originalParams.refreshCache && !originalParams.noCache) {
      const cached = await this.cache.find(store, { params: originalParams });
      if (cached) {
        data = cached.data
        return data;
      }
    }
    
    let { params, url } = this.mergeUrlAndParams(apiUrl, originalParams);
    if (params.refreshCache !== undefined) delete params.refreshCache;
    if (params.noCache !== undefined) delete params.noCache;

    // const kebabcaseParams = kebabcaseKeys(params, { deep: true }); 
    data = await this.fetch(url, params);
    // data = camelcaseKeys(data, { deep: true }); 
    
    // cache result
    if (this.cache && store && !originalParams.noCache && !data.error) {
      await this.cache.save(store, data, { params: originalParams });
    }
  
    return data;
  }

}

