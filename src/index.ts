import { merge } from 'lodash';
import Query from './modules/Query';
import { Options } from './types';


export default class Algolib {
  protected options: Options;
  public query: Query;

  constructor (options?: Options) {
    this.options = merge({
      mode: 'MAINNET',
      indexerAPI: 'https://mainnet-idx.algonode.cloud',
      nodeAPI: 'https://mainnet-api.algonode.cloud',
    }, options);


    this.query = new Query(this.options);
  }

}
