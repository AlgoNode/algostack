// import { Buffer } from 'buffer/index.js';
// import algosdk from 'algosdk';
import omitBy from 'lodash/omitBy.js';
import isNil from 'lodash/isNil.js';



//
// Encoder class
// ----------------------------------------------
export default class Encoder {
  // protected options: Options;
  // constructor (forwarded: AlgoStack) {
  //   this.options = forwarded.options;
  // }


  /**
   * encode UTF string to base64
   * ==================================================
   */
  public utfToBase64 (str: string) {
    return Buffer.from(str).toString('base64');
  }


  /**
  //  * Encode transaction node
  //  * ==================================================
  //  */
  // public encodeNote(obj) {
  //   obj = {...obj};
  //   Object.entries(obj).forEach(([key, value]) => {
  //     if (typeof value === 'boolean') obj[key] = value.toString();
  //   });
  //   obj = omitBy(obj, (v) => (
  //     isNil(v) || v === ''
  //   ));
  //   return algosdk.encodeObj(obj);
  // }

  /**
   * Decode transaction note
   * ==================================================
   */
  // public decodeNote(str: string) {
  //   if (!str) return;
  //   const buffer = Buffer.from(str, 'base64');
  //   const obj = algosdk.decodeObj(buffer) as Record<string, any>;
  //   Object.entries(obj).forEach(([key, value]) => {
  //     if (value === 'true') obj[key] = true;
  //     else if (value === 'false') obj[key] = false;
  //   });
  //   return obj;
  // }
}

