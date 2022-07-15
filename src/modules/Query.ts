import axios from 'axios';
import camelcaseKeys from 'camelcase-keys';
import BaseModule from './Base';
import { stringifyObjectValues } from '../helpers/object'; 


export interface QueryParams {
  limit?: number,
  [key: string]: string|number|boolean|undefined,
}


//
// QUERY class
// ----------------------------------------------
export default class Query extends BaseModule {
  constructor (...args: [any]) {
    super(...args);
  }

  //
  // Fetch data
  // ----------------------------------------------
  private async fetchData(endpoint: string, params: QueryParams = {}) {
    try {
      const stringParams = stringifyObjectValues(params);
      const queryString: string = new URLSearchParams(stringParams).toString();  
      const response = await axios.get(`${this.options.indexerAPI}${endpoint}?${queryString}`);
      const data = camelcaseKeys(response.data, {deep: true});
      return data;
    }
    catch (error) {
      console.dir(error);
      return {};
    }
  }

  //
  // Query wrapper
  // ----------------------------------------------
  async get(endpoint: string, params: QueryParams = {}) {
    const loop:boolean = params.limit === -1;
    if (loop) delete params.limit; 

    const data: Object  = await this.fetchData(endpoint, params);
    if (loop) {
      while (data['next-token']) {
        const nextData: Object = await this.fetchData(endpoint, { ...params, next: data['next-token']});
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
    return data
  }


  //
  // Quick methods
  // ----------------------------------------------

  // accounts
  async account(accountId: string, params: QueryParams = {}) {
    return await this.get(`/v2/accounts/${accountId}`, params);
  }
  async accountTransactions(accountId: string, params: QueryParams = {}) {
    return await this.get(`/v2/accounts/${accountId}/transactions`, params);
  }
  // app
  async application(appId: number, params: QueryParams = {}) {
    return await this.get(`/v2/applications/${appId}`, params);
  }
  // asset
  async asset(assetId: number, params: QueryParams = {}) {
    return await this.get(`/v2/assets/${assetId}`, params);
  }
  async assetBalances(assetId: number, params: QueryParams = {}) {
    return await this.get(`/v2/assets/${assetId}/balances`, params);
  }
  async assetTransactions(assetId: number, params: QueryParams = {}) {
    return await this.get(`/v2/assets/${assetId}/transactions`, params);
  }
  // block
  async lookupBlock(round: number, params: QueryParams = {}) {
    return await this.get(`/v2/blocks/${round}`, params);
  }
  // transaction
  async transaction(id: string, params: QueryParams = {}) {
    return await this.get(`/v2/transactions/${id}`, params);
  }

  //search
  async accounts(params: QueryParams = {}) {
    return await this.get(`/v2/accounts`, params);
  }
  async applications(params: QueryParams = {}) {
    return await this.get(`/v2/applications`, params);
  }
  async assets(params: QueryParams = {}) {
    return await this.get(`/v2/assets`, params);
  }
  async transactions(params: QueryParams = {}) {
    return await this.get(`/v2/transactions`, params);
  }

}
