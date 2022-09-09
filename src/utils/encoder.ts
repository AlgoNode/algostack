// import { Buffer } from 'buffer/index.js';
import { decodeObj} from 'algosdk';
import omitBy from 'lodash/omitBy.js';
import isNil from 'lodash/isNil.js';
import { NoteEncoding, NoteProps } from '../modules/Addons/index.js';



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
   * Decode transaction note
   * ==================================================
   */
  public decodeNote(str: string): NoteProps {
    if (!str) return {
      encoding: NoteEncoding.NONE,
      content: str,
    };

    const buffer = Buffer.from(str, 'base64');
    const utf8 = buffer.toString('utf8');

    // MSGPack
    if (utf8.startsWith('�')) {
      try {
        return {
          encoding: NoteEncoding.MSGPACK,
          content: decodeObj(buffer),
        }
      }
      catch {
        return {
          encoding: NoteEncoding.NONE,
          content: utf8,
        }
      }
    }

    // JSON
    if (utf8.startsWith('{')) {
      try {
        return {
          encoding: NoteEncoding.JSON,
          content: JSON.parse(utf8),
        }
      }
      catch {
        return {
          encoding: NoteEncoding.NONE,
          content: utf8,
        }
      }
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
}

