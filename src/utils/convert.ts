import camelcaseKeys from 'camelcase-keys';
import snakecaseKeys from 'snakecase-keys';
import kebabcaseKeys from 'kebabcase-keys';
import AlgoStack from '../index.js';
import Options, { Cases } from './options.js';


//
// Convert class
// ----------------------------------------------
export default class Convert {
  protected options: Options;
  constructor (forwarded: AlgoStack) {
    this.options = forwarded.options;
  }

  //
  // Convert object keys to user-defined case
  // ----------------------------------------------
  public convertCase(obj: Object, toCase = this.options.convertCase as Cases) {
    if (toCase === 'none') return obj; 
    if (toCase === 'camelcase') return camelcaseKeys(obj, {deep:true});
    if (toCase === 'snakecase') return snakecaseKeys(obj, {deep:true});
    if (toCase === 'kebabcase') return kebabcaseKeys(obj, {deep:true});
  }
  public toUserCase = this.convertCase;

  public fromUserCase(obj: Object) {
    if (this.options.convertCase === 'none') return obj;
    return kebabcaseKeys(obj, {deep:true});
  }


  //
  // Convert object values to strings
  // ----------------------------------------------
  public objectValuesToString(params: object) {
    const obj: {[k:string]: string} = {};
    Object.entries(params)
      .forEach(([key, value]) => {
        obj[key] = String(value);
      });
    return obj;
  }
}

