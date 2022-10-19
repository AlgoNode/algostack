import axios from 'axios';
import { pRateLimit } from 'p-ratelimit';
import camelcaseKeys from 'camelcase-keys';
import kebabcaseKeys from 'kebabcase-keys';
import AlgoStack from '../../index.js';
import Options from '../../utils/options.js';
import { Addon } from '../QueryAddons/index.js';
import { utf8ToB64, objectValuesToString } from '../../helpers/encoding.js';
import type Cache from '../Cache/index.js';
import type QueryAddons from '../QueryAddons/index.js';
import type { QueryParams, Payload } from './types.js';

/**
 * Query class
 * ==================================================
 */
export default class Query {
  protected options: Options;
  protected queryAddons?: QueryAddons;
  protected cache?: Cache; 
  protected rateLimit: <T>(fn: () => Promise<T>) => Promise<T>;
  constructor(forwarded: AlgoStack) {
    this.options = forwarded.options;
    this.cache = forwarded.cache;
    this.queryAddons = forwarded.queryAddons;
    this.rateLimit = pRateLimit({
      interval: 1000,
      rate: 50, 
    });
  }

 
  /**
   * Query wrapper
   * ==================================================
   */
  private async indexerQuery(store: string, id: string|number|null, endpoint: string, params: QueryParams = {}, addons?: Addon[]) {
    let data: Payload;

    // get cached data
    if (this.cache && !params.refreshCache) {
      const cached = await this.cache.find(store, { id, params });
      if (cached) {
        data = cached.data
        if (addons) await this.queryAddons.apply(data, addons);
        return data;
      }
    }
    
    const url = id ? endpoint.replace(':id', String(id)) : endpoint;
    const loop:boolean = params.limit === -1;
    if (loop) delete params.limit; 
    if (params.refreshCache !== undefined) delete params.refreshCache;
    const encodedParams = this.encodeParams(params);
    const kebabcaseParams = kebabcaseKeys(encodedParams, { deep: true }); 

    data = await this.fetchIndexer(url, kebabcaseParams);
    
    // Loop
    if (loop) {
      while (data['next-token']) {
        const nextData: Payload = await this.fetchIndexer(
          url, 
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
    
    // cache result
    if (this.cache && !data.error) {
      await this.cache.save(store, data, { id, params });
    }

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
      const stringifiedParams = objectValuesToString(params);
      const queryString: string = new URLSearchParams(stringifiedParams).toString();  
      const response = await this.rateLimit(
        () => axios.get(`${this.options.indexerUrl}${endpoint}?${queryString}`)
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

}

