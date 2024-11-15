import type AlgoStack from '../../index';
import type { PromiseResolver } from '../../types';
import type { AddonsKeyMap, AddonsList } from '../addons/types';
import type Cache from '../cache/index';
import type {
  FilterFn,
  Payload,
  QueryConfigs,
  QueryOptions,
  QueryParams,
  QueryQueue,
  RateLimiter,
} from './types';
import type { AxiosHeaders, AxiosInstance } from 'axios';

import { Buffer } from 'buffer';
import axios from 'axios';
import camelcaseKeys from 'camelcase-keys';
import kebabcaseKeys from 'kebabcase-keys';
import cloneDeep from 'lodash-es/cloneDeep.js';
import merge from 'lodash-es/merge.js';
import objHash from 'object-hash';
import { pRateLimit } from 'p-ratelimit';

import { BaseModule } from '../_baseModule.js';
import { utf8ToB64 } from '../../helpers/encoding.js';
import Addons from '../addons/addons.js';
import { CacheTable } from '../cache/index.js';
import { ApiUrl } from './enums.js';

/**
 * Query class
 * ==================================================
 */
export default class Query extends BaseModule {
  private configs: QueryConfigs = {};
  private queue: QueryQueue = new Map();
  protected cache?: Cache;
  protected addons?: Addons;
  protected rateLimiters: Map<string, RateLimiter> = new Map();

  constructor(configs: QueryConfigs = {}) {
    super();
    this.setConfigs(configs);
  }

  public setConfigs(configs: QueryConfigs) {
    this.configs = merge(
      {
        rateLimiter: {
          interval: 1000,
          rate: 50,
          concurrency: 25,
        },
      },
      this.configs,
      configs,
    );
    this.initRateLimiters();
  }

  public init(stack: AlgoStack) {
    super.init(stack);
    this.cache = stack.cache;
    this.addons = stack.addons;
    return this;
  }

  /**
   * Rate Limiters
   * ==================================================
   */
  private initRateLimiters() {
    const defaultConfigs = {
      interval: 1000,
      rate: 50,
      concurrency: 25,
      ...(this.configs.rateLimiter || {}),
    };

    this.rateLimiters.set('default', pRateLimit(defaultConfigs));
    if (!this.configs.rateLimiters) return;
    Object.entries(this.configs.rateLimiters).forEach(([key, configs]) => {
      this.rateLimiters.set(
        key,
        pRateLimit({
          ...defaultConfigs,
          ...configs,
        }),
      );
    });
  }

  /**
   * Get request headers
   * ==================================================
   */
  private getReqHeaders(api: ApiUrl, params: QueryParams) {
    const token = this.stack.configs.apiToken;
    if (!token) return params?.headers;
    let tokenHeader: string | undefined = undefined;
    if (api === ApiUrl.INDEXER) tokenHeader = 'X-Indexer-API-Token';
    else if (api === ApiUrl.NODE) tokenHeader = 'X-Algo-API-Token';
    if (!tokenHeader) return params;
    return {
      ...(params.headers || {}),
      [tokenHeader]: token,
    };
  }

  /**
   * Query wrapper
   * ==================================================
   */
  private query(queryOptions: QueryOptions) {
    return new Promise(async (resolve, reject) => {
      if (!this.initiated) await this.waitForInit();
      const {
        base = ApiUrl.INDEXER,
        endpoint,
        params: originalParams = {},
      } = queryOptions;
      let data: Payload;

      // Prepare Cache
      const cacheTable = originalParams.cacheTable;
      const noCache = originalParams.noCache;
      const refreshCache = originalParams.refreshCache;
      if (originalParams.cacheTable !== undefined)
        delete originalParams.cacheTable;
      if (originalParams.noCache !== undefined) delete originalParams.noCache;
      if (originalParams.refreshCache !== undefined)
        delete originalParams.refreshCache;

      // Prepare Params
      let { params, url } = this.mergeUrlAndParams(endpoint, originalParams);

      if (params.limit === -1) delete params.limit;
      if (params.cacheTable !== undefined) delete params.cacheTable;
      if (params.noCache !== undefined) delete params.noCache;
      if (params.refreshCache !== undefined) delete params.refreshCache;

      const addons = params.addons as AddonsList | AddonsKeyMap | undefined;
      if (addons) delete params.addons;

      const filter = params.filter;

      const cleanParams = this.cleanParams(params);
      const encodedParams = this.encodeParams(cleanParams);
      const reqParams = kebabcaseKeys(encodedParams, { deep: true });
      reqParams.url = `${base}${url}`;
      reqParams.headers = this.getReqHeaders(base, reqParams);
      if (filter) delete params.filter;

      // get cached data
      if (this.cache && cacheTable && !refreshCache && !noCache) {
        const cached = await this.cache.find(cacheTable, {
          where: { params: reqParams },
        });
        if (cached) {
          data = cached.data;
          if (addons && this.addons) await this.addons.apply(data, addons);
          return resolve(data);
        }
      }
      const hash = objHash({ base, endpoint, originalParams });
      this.pushToQueue(hash, resolve);
      if (this.queue.get(hash)?.length > 1) return;

      data = await this.fetchData(
        `${this.stack.configs[base]}${url}`,
        reqParams,
      );
      data = camelcaseKeys(data, { deep: true });

      if (filter) data = this.applyFilter(data, filter);

      // Loop
      let i = 0;
      while (this.shouldFetchNext(data, originalParams) && i < 20) {
        i++;
        let nextData: Payload = await this.fetchData(
          `${this.stack.configs[base]}${url}`,
          { ...reqParams, next: data.nextToken },
        );
        delete data.nextToken;
        nextData = camelcaseKeys(nextData, { deep: true });
        if (filter) nextData = this.applyFilter(nextData, filter);
        // merge arrays, including possible new 'next-token'
        Object.entries(nextData).forEach(([key, value]) => {
          if (Array.isArray(value) && data[key])
            data[key] = [...data[key], ...value];
          else data[key] = value;
        });
      }

      // cache result
      if (this.cache && cacheTable && !noCache && !data?.error) {
        await this.cache.save(cacheTable, data, { params: reqParams });
      }

      if (addons && this.addons) await this.addons.apply(data, addons);
      this.resolveQueue(hash, data);
    });
  }

  private applyFilter(data: Payload | Payload[], filterFn: FilterFn) {
    if (Array.isArray(data)) return data.filter(filterFn);
    Object.entries(data).forEach(([key, value]) => {
      if (Array.isArray(value)) data[key] = value.filter(filterFn);
    });
    return data;
  }

  private getResultsQty(data: Payload | Payload[]) {
    if (Array.isArray(data)) {
      return data.length;
    }
    return Object.values(data)
      .filter((value) => Array.isArray(value))
      .reduce((total, value) => Math.max(value.length, total), 0);
  }

  private shouldFetchNext(data: Payload, params: QueryParams) {
    if (params.limit === -1 && data.nextToken) return true;
    if (
      params.filter &&
      params.limit &&
      data.nextToken &&
      this.getResultsQty(data) < params.limit
    )
      return true;
    return false;
  }

  /**
   *  PARAMS
   * ==================================================
   */
  private mergeUrlAndParams(url: string, params: Record<string, any>) {
    if (!url) return { url: '/', params };
    const unusedParams: Record<string, any> = {};
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (url && url.indexOf(':' + key) > -1) {
          url = url.replace(':' + key, String(value));
        } else {
          unusedParams[key] = value;
        }
      });
    }
    return { url, params: unusedParams };
  }

  private cleanParams(params: QueryParams) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined) delete params[key];
    });
    return params;
  }

  private encodeParams(params: QueryParams) {
    if (typeof params.notePrefix === 'string') {
      params.notePrefix = utf8ToB64(params.notePrefix);
    }
    return params;
  }

  /**
   * Queue
   * ==================================================
   */
  private pushToQueue(hash: string, resolve: PromiseResolver) {
    const resolvers = this.queue.get(hash) || [];
    resolvers.push(resolve);
    this.queue.set(hash, resolvers);
  }

  private resolveQueue(hash: string, data: Payload) {
    const resolvers = this.queue.get(hash) || [];
    resolvers.forEach((resolve) => resolve(data));
    this.queue.delete(hash);
  }

  /**
   * Fetch data
   * ==================================================
   */
  private async fetchData(
    url: string,
    params: QueryParams = {},
    client: AxiosInstance = this.configs.client || axios,
  ) {
    try {
      if (url.indexOf(':id') > -1) {
        return {
          error: {
            url,
            message: 'Url is invalid',
          },
        };
      }
      params = cloneDeep(params);
      const method: string = params.method
        ? String(params.method).toUpperCase()
        : 'GET';
      const headers = params.headers as AxiosHeaders;
      const data = params?.data || params;
      const rateLimiterKey = params.rateLimiter || 'default';
      if (params.method) delete params.method;
      if (params.headers) delete params.headers;
      if (params.url) delete params.url;
      if (params.addons) delete params.addons;
      if (params.filter) delete params.filter;
      if (params.filter) delete params.filter;
      if (params.rateLimiter) delete params.rateLimiter;
      const rateLimiter = this.rateLimiters.get(rateLimiterKey);
      const response = await rateLimiter(() =>
        client.request({
          url,
          method,
          headers,
          params: method === 'GET' ? data : undefined,
          data: method !== 'GET' ? data : undefined,
        }),
      );
      return response.data;
    } catch (e: any) {
      return { error: e.toJSON ? e.toJSON() : e };
    }
  }

  /**
   * Lookup methods
   * ==================================================
   */

  // status
  private async indexerHealth() {
    if (!this.initiated) await this.waitForInit();
    const response = await this.fetchData(
      `${this.stack.configs.indexerUrl}/health`,
    );
    return camelcaseKeys(response, { deep: true });
  }

  // accounts
  private async indexerAccount(accountId: string, params: QueryParams = {}) {
    return await this.query({
      endpoint: `/v2/accounts/:id`,
      params: {
        cacheTable: CacheTable.INDEXER_ACCOUNT,
        ...params,
        id: accountId,
      },
    });
  }
  private async indexerAccountTransactions(
    accountId: string,
    params: QueryParams = {},
  ) {
    return await this.query({
      endpoint: `/v2/accounts/:id/transactions`,
      params: {
        cacheTable: CacheTable.INDEXER_ACCOUNT_TRANSACTIONS,
        ...params,
        id: accountId,
      },
    });
  }
  private async indexerAccountAssets(
    accountId: string,
    params: QueryParams = {},
  ) {
    return await this.query({
      endpoint: `/v2/accounts/:id/assets`,
      params: {
        cacheTable: CacheTable.INDEXER_ACCOUNT_ASSETS,
        ...params,
        id: accountId,
      },
    });
  }
  private async indexerAccountApplications(
    accountId: string,
    params: QueryParams = {},
  ) {
    return await this.query({
      endpoint: `/v2/accounts/:id/apps-local-state`,
      params: {
        cacheTable: CacheTable.INDEXER_ACCOUNT_APPLICATIONS,
        ...params,
        id: accountId,
      },
    });
  }
  // app
  private async indexerApplication(appId: number, params: QueryParams = {}) {
    return await this.query({
      endpoint: `/v2/applications/:id`,
      params: {
        cacheTable: CacheTable.INDEXER_APPLICATION,
        ...params,
        id: appId,
      },
    });
  }
  private async indexerApplicationBox(
    appId: number,
    boxName: string,
    params: QueryParams = {},
  ) {
    return await this.query({
      endpoint: `/v2/applications/:id/boxes`,
      params: {
        cacheTable: CacheTable.INDEXER_APPLICATION_BOX,
        ...params,
        id: appId,
        name: `b64:${boxName}`,
      },
    });
  }
  private async indexerApplicationBoxes(
    appId: number,
    params: QueryParams = {},
  ) {
    return await this.query({
      endpoint: `/v2/applications/:id/boxes`,
      params: {
        cacheTable: CacheTable.INDEXER_APPLICATION_BOXES,
        ...params,
        id: appId,
      },
    });
  }
  // asset
  private async indexerAsset(assetId: number, params: QueryParams = {}) {
    return await this.query({
      endpoint: `/v2/assets/:id`,
      params: {
        cacheTable: CacheTable.INDEXER_ASSET,
        ...params,
        id: assetId,
      },
    });
  }
  private async indexerAssetBalances(
    assetId: number,
    params: QueryParams = {},
  ) {
    return await this.query({
      endpoint: `/v2/assets/:id/balances`,
      params: {
        cacheTable: CacheTable.INDEXER_ASSET_BALANCES,
        ...params,
        id: assetId,
      },
    });
  }
  private async indexerAssetTransactions(
    assetId: number,
    params: QueryParams = {},
  ) {
    return await this.query({
      endpoint: `/v2/assets/:id/transactions`,
      params: {
        cacheTable: CacheTable.INDEXER_ASSET_TRANSACTIONS,
        ...params,
        id: assetId,
      },
    });
  }
  // block
  private async indexerBlock(round: number, params: QueryParams = {}) {
    return await this.query({
      endpoint: `/v2/blocks/:id`,
      params: {
        cacheTable: CacheTable.INDEXER_BLOCK,
        ...params,
        id: round,
      },
    });
  }
  // transaction
  private async indexerTransaction(id: string, params: QueryParams = {}) {
    return await this.query({
      endpoint: `/v2/transactions/:id`,
      params: {
        cacheTable: CacheTable.INDEXER_TXN,
        ...params,
        id: id,
      },
    });
  }

  /**
   * Node queries (Algod API)
   * ==================================================
   */
  private async nodeHealth() {
    if (!this.initiated) await this.waitForInit();
    const response = await this.fetchData(
      `${this.stack.configs.apiUrl}/health`,
    );
    return camelcaseKeys(response, { deep: true });
  }
  private async nodeStatus() {
    if (!this.initiated) await this.waitForInit();
    const response = await this.fetchData(
      `${this.stack.configs.apiUrl}/v2/status`,
    );
    return camelcaseKeys(response, { deep: true });
  }
  private async nodeStatusAfter(block: number) {
    if (!this.initiated) await this.waitForInit();
    const response = await this.fetchData(
      `${this.stack.configs.apiUrl}/v2/status/wait-for-block-after/${block}`,
    );
    return camelcaseKeys(response, { deep: true });
  }

  private async nodeAccount(accountId: string, params: QueryParams = {}) {
    return await this.query({
      base: ApiUrl.NODE,
      endpoint: `/v2/accounts/:id`,
      params: {
        cacheTable: CacheTable.NODE_ACCOUNT,
        ...params,
        id: accountId,
      },
    });
  }
  private async nodeAccountApplication(
    accountId: string,
    appId: number,
    params: QueryParams = {},
  ) {
    return await this.query({
      base: ApiUrl.NODE,
      endpoint: `/v2/accounts/:id/applications/:appId`,
      params: {
        cacheTable: CacheTable.NODE_ACCOUNT_APPLICATION,
        ...params,
        id: accountId,
        appId,
      },
    });
  }
  private async nodeAccountAsset(
    accountId: string,
    assetId: number,
    params: QueryParams = {},
  ) {
    return await this.query({
      base: ApiUrl.NODE,
      endpoint: `/v2/accounts/:id/assets/:assetId`,
      params: {
        cacheTable: CacheTable.NODE_ACCOUNT_ASSET,
        ...params,
        id: accountId,
        assetId,
      },
    });
  }
  private async nodeBlock(round: number, params: QueryParams = {}) {
    return await this.query({
      base: ApiUrl.NODE,
      endpoint: `/v2/blocks/:id`,
      params: {
        cacheTable: CacheTable.NODE_BLOCK,
        ...params,
        id: round,
      },
    });
  }
  private async nodeDisassembleTeal(b64: string) {
    if (!b64?.length) return undefined;
    if (!this.initiated) await this.waitForInit();
    const programBuffer = Buffer.from(b64, 'base64');
    const response = (await this.fetch(
      `${this.stack.configs[ApiUrl.NODE]}/v2/teal/disassemble`,
      {
        method: 'POST',
        cacheTable: CacheTable.NODE_TEAL,
        refreshCache: true,
        headers: { 'Content-Type': 'application/x-binary' },
        data: programBuffer,
      },
    )) as Payload;
    return response?.result;
  }

  // Wrap everything together
  public lookup = {
    health: this.indexerHealth.bind(this),
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
      health: this.nodeHealth.bind(this),
      status: this.nodeStatus.bind(this),
      statusAfter: this.nodeStatusAfter.bind(this),
      account: this.nodeAccount.bind(this),
      accountApplicaction: this.nodeAccountApplication.bind(this),
      accountAsset: this.nodeAccountAsset.bind(this),
      block: this.nodeBlock.bind(this),
      dissableTeal: this.nodeDisassembleTeal.bind(this),
    },
  };

  /**
   * Search
   * ==================================================
   */
  private async accounts(params: QueryParams = {}) {
    return await this.query({
      endpoint: `/v2/accounts`,
      params: {
        cacheTable: CacheTable.INDEXER_ACCOUNTS,
        ...params,
      },
    });
  }
  private async applications(params: QueryParams = {}) {
    return await this.query({
      endpoint: `/v2/applications`,
      params: {
        cacheTable: CacheTable.INDEXER_APPLICATIONS,
        ...params,
      },
    });
  }
  private async assets(params: QueryParams = {}) {
    return await this.query({
      endpoint: `/v2/assets`,
      params: {
        cacheTable: CacheTable.INDEXER_ASSETS,
        ...params,
      },
    });
  }
  private async transactions(params: QueryParams = {}) {
    return await this.query({
      endpoint: `/v2/transactions`,
      params: {
        cacheTable: CacheTable.INDEXER_TXNS,
        ...params,
      },
    });
  }

  // Wrap everything together
  public search = {
    accounts: this.accounts.bind(this),
    applications: this.applications.bind(this),
    assets: this.assets.bind(this),
    transactions: this.transactions.bind(this),
  };

  /**
   * Custom fetch queries
   * ==================================================
   */
  public fetch(
    apiUrl: string,
    originalParams: QueryParams = {},
    client?: AxiosInstance,
  ) {
    return new Promise(async (resolve, reject) => {
      if (!this.initiated) await this.waitForInit();

      let data: Payload;

      // Prepare Cache
      const cacheTable = originalParams.cacheTable;
      const noCache = originalParams.noCache;
      const refreshCache = originalParams.refreshCache;
      if (originalParams.cacheTable !== undefined)
        delete originalParams.cacheTable;
      if (originalParams.noCache !== undefined) delete originalParams.noCache;
      if (originalParams.refreshCache !== undefined)
        delete originalParams.refreshCache;

      let { params, url } = this.mergeUrlAndParams(apiUrl, originalParams);
      params.url = url;

      // get cached data
      if (this.cache && cacheTable && !refreshCache && !noCache) {
        const cached = await this.cache.find(cacheTable, { where: { params } });
        if (cached) {
          data = cached.data;
          return resolve(data);
        }
      }

      const hash = objHash({ apiUrl, originalParams });
      this.pushToQueue(hash, resolve);
      if (this.queue.get(hash)?.length > 1) return;

      data = await this.fetchData(url, params, client);

      // cache result
      if (this.cache && cacheTable && !noCache && !data?.error) {
        await this.cache.save(cacheTable, data, { params });
      }

      this.resolveQueue(hash, data);
    });
  }
}
