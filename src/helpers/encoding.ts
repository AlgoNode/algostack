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
  const result = {
    encoding: Encoding.B64,
    original: str,
    decoded: str,
  };
  const encodings = [
    Encoding.UTF8,
    // Encoding.HEX,
  ];
  for(let i=0; i<encodings.length; i++) {
    const decoded = Buffer.from(str, 'base64').toString(encodings[i] as BufferEncoding);
    const latinOnly = !/[\W]/.test(decoded);
    if (latinOnly) {
      result.encoding = encodings[i];
      result.decoded = decoded;
      break;
    }
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
 * Decode transaction note
 * ==================================================
 */
export function decodeNote(str: string): NoteProps {
  if (!str) return {
    encoding: Encoding.NONE,
    content: str,
  };
  const buffer = Buffer.from(str, 'base64');
  const utf8 = buffer.toString('utf8');
  let result: NoteProps = {
    encoding: Encoding.NONE,
    content: utf8,
  };
  // MSGPack
  if (utf8.startsWith('�')) {
    try {
      result = {
        encoding: Encoding.MSGPACK,
        content: decodeObj(buffer),
      }
    } catch {}
    return result;
  }

  // JSON
  if (utf8.startsWith('{')) {
    try {
      result = {
        encoding: Encoding.JSON,
        content: JSON.parse(utf8),
      }
    } catch {}
    return result;
  }

  // Plain text
  return {
    encoding: Encoding.TEXT,
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



