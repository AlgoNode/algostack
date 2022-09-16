// import { Buffer } from 'buffer/index.js';
import omitBy from 'lodash/omitBy.js';
import isNil from 'lodash/isNil.js';
import { decodeObj} from 'algosdk';
import { NoteProps } from '../modules/QueryAddons/types.js';
import { Encoding } from '../modules/QueryAddons/enums.js';

export { decodeAddress } from 'algosdk';

/**
 * Convert between UTF8 and base64
 * ==================================================
 */
export function utf8ToB64 (str: string) {
  return Buffer.from(str).toString('base64');
}
export function b64ToUtf8 (str: string) {
  return Buffer.from(str, 'base64').toString();
}


/**
 * Decode base 64
 * Check for encoding returning latin chars
 * ==================================================
 */
export function decodeBase64(str: string) {
  const buffer = Buffer.from(str, 'base64');
  const decoded = buffer.toString('utf8');

  const result = {
    encoding: Encoding.B64,
    original: str,
    decoded: str,
  };

  // MsgPack
  if (decoded.startsWith('�')) {
    try {
      result.encoding = Encoding.MSGPACK,
      result.decoded = decodeObj(buffer) as string;
    } catch {}
  }
  
  // JSON
  else if (decoded.startsWith('{')) {
    try {
      result.encoding = Encoding.JSON,
      result.decoded = JSON.parse(decoded) as string;
    } catch {}
  }

  // UTF8 - Latin char only
  else if (!/[^\x00-\x7F]+/.test(decoded)) {
    result.encoding = Encoding.UTF8,
    result.decoded = decoded;
  }

  return result;
}


/**
 * Convert object values to strings
 * ==================================================
 */
export function objectValuesToString(params: object) {
  const obj: {[k:string]: string} = {};
  Object.entries(params)
    .forEach(([key, value]) => {
      obj[key] = String(value);
    });
  return obj;
}




/**
//  * Encode transaction node
//  * ==================================================
//  */
// export function encodeNote(obj) {
//   obj = {...obj};
//   Object.entries(obj).forEach(([key, value]) => {
//     if (typeof value === 'boolean') obj[key] = value.toString();
//   });
//   obj = omitBy(obj, (v) => (
//     isNil(v) || v === ''
//   ));
//   return algosdk.encodeObj(obj);
// }



