import { Options } from '../types';

export default class BaseModule {
  protected options: Options;
  constructor (options: Options) {
    this.options = options;
  }
}
