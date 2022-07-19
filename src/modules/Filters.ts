import camelcaseKeys from 'camelcase-keys';
import snakecaseKeys from 'snakecase-keys';
import kebabcaseKeys from 'kebabcase-keys';
import Algolib from '../index';
import Options, { Cases } from './Options';


//
// Filters class
// ----------------------------------------------
export default class Filters {
  protected options: Options;
  constructor (forwarded: Algolib) {
    this.options = forwarded.options;
  }

  //
  // Convert object key case
  // ----------------------------------------------
  public convertCase(obj: Object, toCase = this.options.convertCase as Cases) {
    if (toCase === 'none') return obj; 
    if (toCase === 'camelcase') return camelcaseKeys(obj, {deep:true});
    if (toCase === 'snakecase') return snakecaseKeys(obj, {deep:true});
    if (toCase === 'kebabcase') return kebabcaseKeys(obj, {deep:true});
  }
  public convertCaseOut = this.convertCase;
  public convertCaseIn(obj: Object) {
    if (this.options.convertCase === 'none') return obj;
    return kebabcaseKeys(obj, {deep:true});
  }

  //
  // Convert object values to strings
  // ----------------------------------------------
  public stringifyValues(params: object) {
    const obj: {[k:string]: string} = {};
    Object.entries(params)
      .forEach(([key, value]) => {
        obj[key] = String(value);
      });
    return obj;
  }
}

