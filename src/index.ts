import polyfills from './helpers/polyfills';
import Options, { OptionsProps } from './modules/Options';
import Filters from './modules/Filters';
import Storage from './modules/Storage';
import Query from './modules/Query';
import Connector from './modules/Connector';


polyfills;

export default class Algolib {
  public options: Options;
  public filters: Filters;
  public query: Query;
  public connect: Connector;
  public storage: Storage;

  constructor (userOptions?: OptionsProps) {
    this.options = new Options(userOptions);
    this.filters = new Filters(this);
    this.storage = new Storage(this);
    this.query = new Query(this);
    this.connect = new Connector(this);
  }
}
