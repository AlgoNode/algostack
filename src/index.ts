import Options, { OptionsProps } from './modules/Options';
import Filters from './modules/Filters';
import Query from './modules/Query';


export default class Algolib {
  public options: Options;
  public filters: Filters;
  public query: Query;

  constructor (userOptions?: OptionsProps) {
    this.options = new Options(userOptions);
    this.filters = new Filters(this);
    this.query = new Query(this);
  }

}
