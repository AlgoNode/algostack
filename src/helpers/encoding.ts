import { Buffer } from 'buffer'
import { decodeObj, encodeAddress } from 'algosdk';
import { Encoding } from '../enums.js';
import axios from 'axios';
import { isAddress } from './strings.js';
export { decodeAddress, encodeAddress, getApplicationAddress, Transaction } from 'algosdk';

export interface DecodedB64 {
  encoding: Encoding,
  original: string,
  decoded: Partial<
    Record<Encoding, string>
  >,
}

/**
 * Convert between UTF8 and base64
 * ==================================================
 */

export function utf8ToB64 (str: string) {
  return Buffer.from(str).toString('base64');
}
export function hexToB64 (str: string) {
  return Buffer.from(str.replace(/^0x/, ''), 'hex').toString('base64');
}
export function b64ToUtf8 (str: string) {
  return Buffer.from(str, 'base64').toString();
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



export async function decompileTeal(b64: string) {

  const programBuffer = Buffer.from(b64, 'base64');
  const result = await axios({
    method: 'post',
    url: 'https://mainnet-api.algonode.cloud/v2/teal/disassemble',
    headers: {
      'Content-Type': 'application/x-binary',
    },
    data: programBuffer,
  })
  // const append = Buffer.from([0xa4, 0x61, 0x70, 0x61, 0x70]);
  // const prepend = Buffer.from([ 0x8]);
  // const buffer = Buffer.concat([append, programBuffer]);
  // console.log(buffer)
  // const lsig = logicSigFromByte(buffer);
  return result;
}



/**
 * Decode base 64
 * Check for encoding returning latin chars
 * ==================================================
 */
export class B64Decoder {
  public readonly original: string;
  public readonly parsed: Partial< Record< Encoding, string|number|Record<string, any> > >;
  public encoding: Encoding;
  
  constructor (str: string) {
    this.original = str;
    this.encoding = Encoding.B64;
    const buffer = Buffer.from(str, 'base64');
    const decodedStr = buffer.toString('utf8'); 
    const decodedHex = '0x'+buffer.toString('hex').toUpperCase()
    const decodedNumber = parseInt(decodedHex, 16);
    this.parsed = {
      [Encoding.B64]: str,
      [Encoding.HEX]: decodedHex,
    };
    
    // UTF8 - Latin char only
    if (/\p{L}+/gu.test(decodedStr)) {
      this.parsed[Encoding.UTF8] = decodedStr.replace(/[\x00-\x1F]/g, ' ');
      this.encoding = Encoding.UTF8;
    }

    // Number
    if (!isNaN(decodedNumber) && decodedNumber < Number.MAX_SAFE_INTEGER) {
      this.parsed[Encoding.NUMBER] = decodedNumber;
      if (!/^[\a-zA-Z0-9\s\.-_]+$/i.test(decodedStr)){
        this.encoding = Encoding.NUMBER;
      }  
      const hexBytesLength = decodedHex.length - 2; 
      if (hexBytesLength <= 32 && new Date(decodedNumber * 1000).getFullYear() > 2000 ) {
        this.parsed[Encoding.TIMESTAMP] = decodedNumber * 1000;
      }
    }
    

    // JSON
    if (decodedStr.startsWith('{')) {
      try {
        this.parsed[Encoding.JSON] = JSON.parse(decodedStr);
        this.encoding = Encoding.JSON;
      } catch {}
    }

    // MsgPack
    try {
      this.parsed[Encoding.MSGPACK] = decodeObj(buffer) as string;
      this.encoding = Encoding.MSGPACK;
    } catch {}

    // Address
    if (str.length === 44) {
      try {
        const address = encodeAddress(buffer) as string;
        if (isAddress(address)) {
          this.parsed[Encoding.ADDRESS] = encodeAddress(buffer) as string;
          this.encoding = Encoding.ADDRESS;
        }
      } catch {}
    }
  }

  get decoded () {
    return this.parsed?.[this.encoding];
  }
}
