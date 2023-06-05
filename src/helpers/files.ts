import type { CIDVersion } from 'multiformats/types/src/cid';
import axios, { ResponseType } from 'axios';
import { decodeAddress, encodeAddress } from 'algosdk';
import { CID } from 'multiformats/cid';
import * as mfsha2 from 'multiformats/hashes/sha2';
import * as digest from 'multiformats/hashes/digest';
import options from '../utils/options.js';
import { getContentTypeFromUrl, isDomainUrl, isIpfsSubdomain } from './strings.js';




/**
 * Get file content
 * ==================================================
 */
 export function getFileContent(url: string, responseType: ResponseType = 'text'): Promise<string|undefined> {
  return new Promise(async resolve => {
    try {
      const response = await axios.get(url, { 
        responseType
      });
      resolve(response.data);
    } 
    catch (e) {
      resolve(undefined);
    }
  })
}


/**
 * Get file type for a remote URL
 * abort request as soon as headers are in
 * inspired by https://stackoverflow.com/questions/38679681/getting-a-file-type-from-url#answer-38679875
 * ==================================================
 */
 export function getFileType(url: string): Promise<string> {
  return new Promise(async resolve => {
    if (isDomainUrl(url) && !isIpfsSubdomain(url)) return resolve('text/html');
    const contentType = getContentTypeFromUrl(url);
    if (contentType) return resolve(contentType)
    try {
      const head = await axios.head(url, { maxRedirects: 0 });
      const contentType = head.headers['content-type']; 
      resolve(contentType);
    } 
    catch (e) {
      // console.log(e)
      resolve(undefined);
    }
  });
}





/**
 * Extract the IPFS cid from an ipfs URL
 * ==================================================
 */
 export function getIpfsCid(url: string) {
  const isUrl = /^(?:[a-zA-z0-9-]+(?::\/\/|\.[a-zA-z0-9]+\/))/.test(url);
  if (!isUrl) return undefined;
  const match = url
    .match(/^(?:ipfs:\/\/|(?:(?:http:\/\/|https:\/\/)\S*(?:ipfs\/)))([a-zA-z0-9\/\.\-]+)/);
  return match?.[1];
}



/**
 * Get IPFD cid from an address
 * Ex: template-ipfs://{ipfscid:1:raw:reserve:sha2-256}
 * ==================================================
 */

export function getIpfsFromAddress(params: Record<string, string| number>|string, url: string = 'template-ipfs://{ipfscid:1:raw:reserve:sha2-256}') {  
  if (typeof params === 'string') params = { reserve: params };   
  const matches = url.match(/^template-ipfs:\/\/\{ipfscid:([0-9]+):([a-z\-]+):([a-z]+):([a-z0-9\-]+)}(.+)?$/);
  if (!matches) return;
  const [, cidVersion, multicodec, field, , ext] = matches;
  
  if (!params[field]) return;
  const address = params[field];
  let cidCodecCode = 0x55;
  if (multicodec === 'dag-pb') cidCodecCode = 0x70;
  const addr = decodeAddress(address as string)
  const mhdigest = digest.create(mfsha2.sha256.code, addr.publicKey)
  const cid = CID.create(Number(cidVersion) as CIDVersion, cidCodecCode, mhdigest)
  const ipfscid = cid.toString();
  return `ipfs://${ipfscid}${ext || ''}`
}


/**
 * Generate address from cid
 * Ex: template-ipfs://{ipfscid:1:raw:reserve:sha2-256}
 * ==================================================
 */

export function generateAddressFromIpfs(cidStr: string) {  
  const cid = CID.parse(cidStr);
  const address = encodeAddress(cid.multihash.digest);
  return address;
}

