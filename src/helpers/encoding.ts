import { Buffer } from 'buffer';
import { createHash } from 'crypto';
import { decodeObj, encodeAddress } from 'algosdk';
import axios from 'axios';

import { Encoding } from '../enums.js';
import { isAddress } from './strings.js';

export {
  decodeAddress,
  encodeAddress,
  getApplicationAddress,
  Transaction,
} from 'algosdk';

export interface DecodedB64 {
  encoding: Encoding;
  original: string;
  decoded: Partial<Record<Encoding, string>>;
}

/**
 * Convert between UTF8 and base64
 * ==================================================
 */

export const utf8ToB64 = utf8ToBase64;
export function utf8ToBase64(str: string) {
  return Buffer.from(str).toString('base64');
}

export function utf8ToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

export const hexToB64 = hexToBase64;
export function hexToBase64(str: string): string {
  return Buffer.from(str.replace(/^0x/, ''), 'hex').toString('base64');
}

export const b64ToUtf8 = base64ToUtf8;
export function base64ToUtf8(str: string): string {
  return Buffer.from(str, 'base64').toString();
}

export const b64ToBytes = base64ToBytes;
export function base64ToBytes(str: string): Uint8Array {
  return Buffer.from(str, 'base64');
}

export const bytesToB64 = bytesToBase64;
export function bytesToBase64(buffer: Uint8Array): string {
  return Buffer.from(buffer).toString('base64');
}

export function bytesToHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('hex').toUpperCase();
}

export function bytesToUtf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

/**
 * Format 16 bytes as a standard UUID string (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
 * 
 * UUID Format:
 * - time_low (8 hex chars)
 * - time_mid (4 hex chars)  
 * - time_hi_and_version (4 hex chars) - includes version in bits 48-51
 * - clock_seq_and_variant (4 hex chars) - includes variant in bits 64-65
 * - node (12 hex chars)
 */
export function bytesToUUID(bytes: Uint8Array): string {
  if (bytes.length !== 16) {
    throw new Error('UUID must be exactly 16 bytes');
  }
  const hex = Buffer.from(bytes).toString('hex').toLowerCase();
  return [
    hex.substring(0, 8),   // time_low
    hex.substring(8, 12),   // time_mid
    hex.substring(12, 16),  // time_hi_and_version
    hex.substring(16, 20),  // clock_seq_and_variant
    hex.substring(20, 32),  // node
  ].join('-');
}

/**
 * Get UUID version from 16 bytes
 * Returns version number (1-8) or null if invalid
 */
export function getUUIDVersion(bytes: Uint8Array): number | null {
  if (bytes.length !== 16) return null;
  // Version is in byte 6, high nibble (bits 48-51)
  const version = (bytes[6] >> 4) & 0x0F;
  return version >= 1 && version <= 8 ? version : null;
}

/**
 * Check if 16 bytes form a valid UUID (proper version and variant)
 */
export function isValidUUID(bytes: Uint8Array): boolean {
  if (bytes.length !== 16) return false;
  
  // Check version (bits 48-51, byte 6, high nibble)
  const version = (bytes[6] >> 4) & 0x0F;
  if (version < 1 || version > 8) return false;
  
  // Check variant (bits 64-65, byte 8, high 2 bits should be 10)
  const variantBits = (bytes[8] >> 6) & 0x03;
  return variantBits === 0x02; // 10 in binary = 2 in decimal
}

export async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
}

export async function sha512(bytes: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-512', bytes));
}
/**
 * Convert object values to strings
 * ==================================================
 */
export function objectValuesToString(params: object) {
  const obj: { [k: string]: string } = {};
  Object.entries(params).forEach(([key, value]) => {
    obj[key] = String(value);
  });
  return obj;
}

export async function decompileTeal(b64: string) {
  const programBuffer = Buffer.from(b64, 'base64');
  const result = await axios({
    method: 'post',
    url: 'https://mainnet-api.4160.nodely.dev/x2/assetautorank/v2/teal/disassemble',
    headers: {
      'Content-Type': 'application/x-binary',
    },
    data: programBuffer,
  });
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
  public readonly parsed: Partial<
    Record<Encoding, string | number | Record<string, any>>
  >;
  public encoding: Encoding;

  constructor(str: string) {
    this.original = str;
    this.encoding = Encoding.B64;
    const buffer = Buffer.from(str, 'base64');
    const decodedStr = buffer.toString('utf8');
    const decodedHex = '0x' + buffer.toString('hex').toUpperCase();
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
      if (!/^[\a-zA-Z0-9\s\.-_]+$/i.test(decodedStr)) {
        this.encoding = Encoding.NUMBER;
      }
      const hexBytesLength = decodedHex.length - 2;
      if (
        hexBytesLength <= 32 &&
        new Date(decodedNumber * 1000).getFullYear() > 2000
      ) {
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

    // UUID (16 bytes = 128 bits)
    if (buffer.length === 16) {
      try {
        const uuid = bytesToUUID(buffer);
        const version = getUUIDVersion(buffer);
        const valid = isValidUUID(buffer);
        
        // Always include UUID format for reference
        this.parsed[Encoding.UUID] = uuid;
        
        // Only set as primary encoding if it's a valid UUID
        // UUID versions: 1 (time), 3 (MD5), 4 (random), 5 (SHA-1), 6-8 (future)
        if (valid && version !== null && this.encoding === Encoding.B64) {
          this.encoding = Encoding.UUID;
        }
      } catch {}
    }
  }

  get decoded() {
    return this.parsed?.[this.encoding];
  }
}

/**
 * ABI Type Decoders
 * ==================================================
 * Generic decoders for Algorand ABI types
 */

export interface ABIField {
  name: string;
  type: string;
}

/**
 * Calculate the size of an ABI type in bytes
 * Returns null for dynamic types (string, byte[], arrays)
 */
export function getABITypeSize(type: string): number | null {
  // Fixed-size types
  if (type === 'bool') return 1;
  if (type === 'address') return 32;
  
  // uint types
  if (type.startsWith('uint')) {
    const match = type.match(/^uint(\d+)$/);
    if (match) {
      const bits = parseInt(match[1]);
      return Math.ceil(bits / 8);
    }
  }
  
  // byte[N] - fixed-size byte array
  const byteArrayMatch = type.match(/^byte\[(\d+)\]$/);
  if (byteArrayMatch) {
    return parseInt(byteArrayMatch[1]);
  }
  
  // Dynamic types (string, byte[], arrays) have variable size
  if (type === 'string' || type === 'byte[]' || type.includes('[]')) {
    return null;
  }
  
  return null;
}

/**
 * Decode ABI uint64 (8 bytes, big-endian)
 */
export function decodeABIUint64(base64Value: string): bigint {
  try {
    const bytes = Buffer.from(base64Value, 'base64');
    if (bytes.length !== 8) return BigInt(0);
    let result = BigInt(0);
    for (let i = 0; i < 8; i++) {
      result = (result << BigInt(8)) | BigInt(bytes[i]);
    }
    return result;
  } catch {
    return BigInt(0);
  }
}

/**
 * Decode ABI uint of any size (bits must be multiple of 8)
 */
export function decodeABIUint(base64Value: string, bits: number): bigint {
  try {
    const bytes = Buffer.from(base64Value, 'base64');
    const expectedBytes = Math.ceil(bits / 8);
    if (bytes.length !== expectedBytes) return BigInt(0);
    
    let result = BigInt(0);
    for (let i = 0; i < bytes.length; i++) {
      result = (result << BigInt(8)) | BigInt(bytes[i]);
    }
    return result;
  } catch {
    return BigInt(0);
  }
}

/**
 * Decode ABI bool (single byte, 0 or 1)
 */
export function decodeABIBool(base64Value: string): boolean {
  try {
    const bytes = Buffer.from(base64Value, 'base64');
    return bytes.length > 0 && bytes[bytes.length - 1] !== 0;
  } catch {
    return false;
  }
}

/**
 * Decode ABI address (32 bytes)
 */
export function decodeABIAddress(base64Value: string): string {
  try {
    const decoder = new B64Decoder(base64Value);
    const address = decoder.parsed[Encoding.ADDRESS];
    return typeof address === 'string' ? address : base64Value;
  } catch {
    return base64Value;
  }
}

/**
 * Decode ABI string (2-byte length prefix + UTF-8 bytes)
 */
export function decodeABIString(base64Value: string): string {
  try {
    const bytes = Buffer.from(base64Value, 'base64');
    if (bytes.length < 2) return '';
    
    // Read 2-byte length prefix
    const length = (bytes[0] << 8) | bytes[1];
    if (bytes.length < 2 + length) return '';
    
    // Decode UTF-8 string
    return bytes.slice(2, 2 + length).toString('utf-8');
  } catch {
    return '';
  }
}

/**
 * Decode ABI bytes (2-byte length prefix + raw bytes)
 */
export function decodeABIBytes(base64Value: string): Uint8Array {
  try {
    const bytes = Buffer.from(base64Value, 'base64');
    if (bytes.length < 2) return new Uint8Array();
    
    // Read 2-byte length prefix
    const length = (bytes[0] << 8) | bytes[1];
    if (bytes.length < 2 + length) return new Uint8Array();
    
    return bytes.slice(2, 2 + length);
  } catch {
    return new Uint8Array();
  }
}

/**
 * Calculate total size of a tuple/struct (returns null if dynamic)
 */
export function calculateTupleSize(
  fields: ABIField[],
  structs?: Record<string, ABIField[]>,
): number | null {
  let totalSize = 0;
  
  for (const field of fields) {
    const fieldType = field.type;
    
    // Check if it's a nested struct
    if (structs && structs[fieldType]) {
      const structSize = calculateTupleSize(structs[fieldType], structs);
      if (structSize === null) return null;
      totalSize += structSize;
    } else {
      const size = getABITypeSize(fieldType);
      if (size === null) return null; // Dynamic type
      totalSize += size;
    }
  }
  
  return totalSize;
}

/**
 * Decode an ABI tuple (struct) by parsing fields sequentially
 * @param base64Value - The base64-encoded tuple bytes
 * @param fields - Array of field definitions with name and type
 * @param structs - Optional struct definitions for nested structs
 * @returns Object with decoded fields
 */
export function decodeABITuple(
  base64Value: string,
  fields: ABIField[],
  structs?: Record<string, ABIField[]>,
): Record<string, any> {
  try {
    const bytes = Buffer.from(base64Value, 'base64');
    const result: Record<string, any> = {};
    let offset = 0;

    for (const field of fields) {
      const fieldType = field.type;
      
      // Handle nested structs
      if (structs && structs[fieldType]) {
        // Calculate struct size
        const structSize = calculateTupleSize(structs[fieldType], structs);
        if (structSize === null) {
          result[field.name] = { error: 'Dynamic struct size not supported' };
          continue;
        }
        
        const fieldBytes = bytes.slice(offset, offset + structSize);
        result[field.name] = decodeABITuple(
          fieldBytes.toString('base64'),
          structs[fieldType],
          structs,
        );
        offset += structSize;
        continue;
      }

      // Handle primitive types
      const size = getABITypeSize(fieldType);
      
      if (size === null) {
        // Dynamic type - read length prefix first
        if (offset + 2 > bytes.length) break;
        const length = (bytes[offset] << 8) | bytes[offset + 1];
        offset += 2;
        
        if (offset + length > bytes.length) break;
        const fieldBytes = bytes.slice(offset, offset + length);
        
        if (fieldType === 'string') {
          result[field.name] = fieldBytes.toString('utf-8');
        } else if (fieldType === 'byte[]') {
          // Use B64Decoder to get multiple representations
          const decoder = new B64Decoder(fieldBytes.toString('base64'));
          result[field.name] = {
            value: decoder.decoded,
            decoder: decoder,
          };
        } else {
          result[field.name] = fieldBytes;
        }
        offset += length;
      } else {
        // Fixed-size type
        if (offset + size > bytes.length) break;
        const fieldBytes = bytes.slice(offset, offset + size);
        
        // Decode based on type
        if (fieldType.startsWith('byte[')) {
          // Use B64Decoder to get multiple representations (UTF-8, hex, UUID, etc.)
          const decoder = new B64Decoder(fieldBytes.toString('base64'));
          result[field.name] = {
            value: decoder.decoded,
            decoder: decoder,
          };
        } else if (fieldType.startsWith('uint')) {
          let value = BigInt(0);
          for (let i = 0; i < size; i++) {
            value = (value << BigInt(8)) | BigInt(fieldBytes[i]);
          }
          result[field.name] = size <= 8 ? Number(value) : value;
        } else if (fieldType === 'bool') {
          result[field.name] = fieldBytes[0] !== 0;
        } else if (fieldType === 'address') {
          const decoder = new B64Decoder(fieldBytes.toString('base64'));
          result[field.name] = {
            value: decoder.parsed[Encoding.ADDRESS] || fieldBytes,
            decoder: decoder,
          };
        } else {
          result[field.name] = fieldBytes;
        }
        
        offset += size;
      }
    }

    return result;
  } catch (e) {
    console.warn('Failed to decode ABI tuple:', e);
    return {
      error: 'Tuple decoding failed',
      raw: base64Value,
    };
  }
}
