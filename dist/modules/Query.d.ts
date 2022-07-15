import Algolib from '../index';
import Filters from './Filters';
import Options from './Options';
export interface QueryParams {
    limit?: number;
    [key: string]: string | number | boolean | undefined;
}
export default class Query {
    protected options: Options;
    protected filters: Filters;
    constructor(forwarded: Algolib);
    get(endpoint: string, params?: QueryParams): Promise<Object>;
    private fetchData;
    account(accountId: string, params?: QueryParams): Promise<Object>;
    accountTransactions(accountId: string, params?: QueryParams): Promise<Object>;
    application(appId: number, params?: QueryParams): Promise<Object>;
    asset(assetId: number, params?: QueryParams): Promise<Object>;
    assetBalances(assetId: number, params?: QueryParams): Promise<Object>;
    assetTransactions(assetId: number, params?: QueryParams): Promise<Object>;
    lookupBlock(round: number, params?: QueryParams): Promise<Object>;
    transaction(id: string, params?: QueryParams): Promise<Object>;
    accounts(params?: QueryParams): Promise<Object>;
    applications(params?: QueryParams): Promise<Object>;
    assets(params?: QueryParams): Promise<Object>;
    transactions(params?: QueryParams): Promise<Object>;
}
