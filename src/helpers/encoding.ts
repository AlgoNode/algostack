// import { Buffer } from 'buffer/index.js';
import omitBy from 'lodash/omitBy.js';
import isNil from 'lodash/isNil.js';
import { decodeObj} from 'algosdk';
import { NoteProps } from '../modules/QueryAddons/types.js';
import { NoteEncoding } from '../modules/QueryAddons/enums.js';

export { decodeAddress } from 'algosdk';

/**
 * encode UTF string to base64
 * ==================================================
 */
export function utfToBase64 (str: string) {
  return Buffer.from(str).toString('base64');
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
 * Decode transaction note
 * ==================================================
 */
export function decodeNote(str: string): NoteProps {
  if (!str) return {
    encoding: NoteEncoding.NONE,
    content: str,
  };
  const buffer = Buffer.from(str, 'base64');
  const utf8 = buffer.toString('utf8');
  let result: NoteProps = {
    encoding: NoteEncoding.NONE,
    content: utf8,
  };
  // MSGPack
  if (utf8.startsWith('�')) {
    try {
      result = {
        encoding: NoteEncoding.MSGPACK,
        content: decodeObj(buffer),
      }
    } catch {}
    return result;
  }

  // JSON
  if (utf8.startsWith('{')) {
    try {
      result = {
        encoding: NoteEncoding.JSON,
        content: JSON.parse(utf8),
      }
    } catch {}
    return result;
  }

  // Plain text
  return {
    encoding: NoteEncoding.TEXT,
    content: utf8,
  }
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



