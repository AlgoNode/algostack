import axios, { AxiosResponse } from 'axios';
import { decodeAddress } from 'algosdk';
import { CID } from 'multiformats/cid';
import * as mfsha2 from 'multiformats/hashes/sha2';
import * as digest from 'multiformats/hashes/digest';
import type { CIDVersion } from 'multiformats/types/src/cid';
import options from '../utils/options.js';

/**
 * Get file type for a remote URL
 * abort request as soon as headers are in
 * inspired by https://stackoverflow.com/questions/38679681/getting-a-file-type-from-url#answer-38679875
 * ==================================================
 */
 export function getFileContent(url: string): Promise<string|undefined> {
  return new Promise(async resolve => {
    try {
      const response = await axios.get(url);
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
    try {
      const head = await axios.head(url, { maxRedirects: 0 });
      const contentType = head.headers['content-type']; 
      resolve(contentType);
    } 
    catch (e) {
      console.log(e)
      resolve(undefined);
    }
  });
}



/**
 * Get an IPFS gateway url for a specific cid
 * ==================================================
 */

 export function getIpfsUrl(cid: string) {
  return `${options.ipfsGatewayUrl}/${cid}`;
}

/**
 * Extract the IPFS cid from an ipfs URL
 * ==================================================
 */
 export function getIpfsCid(url: string) {
  const isUrl = /^(?:[a-zA-z0-9-]+(?::\/\/|\.[a-zA-z0-9]+\/))/.test(url);
  if (!isUrl) return url;
  
  const match = url
    .match(/^(?:ipfs:\/\/|(?:(?:http:\/\/|https:\/\/)\S*(?:ipfs\/)))([a-zA-z0-9\/\.\-]+)/);
  return match?.[1];
}



/**
 * Get IPFD cid from an address
 * Ex: template-ipfs://{ipfscid:1:raw:reserve:sha2-256}
 * ==================================================
 */

export function getIpfsFromAddress(url: string, params: Record<string, string| number>) {  
  const matches = url.match(/^template-ipfs:\/\/\{ipfscid:([0-9]+):([a-z\-]+):([a-z]+):([a-z0-9\-]+)}(.+)?$/);
  if (!matches) return;
  const [, cidVersion, multicodec, field, , ext] = matches;
  
  if (!params[field]) return;
  const address = params[field];
  let cidCodecCode = 0x55;
  if (multicodec === 'dag-pb') cidCodecCode = 0x70;
  const addr = decodeAddress(address as string)
  const mhdigest = digest.create(mfsha2.sha256.code, addr.publicKey)
  const cid = CID.create(parseInt(cidVersion) as CIDVersion, cidCodecCode, mhdigest)
  const ipfscid = cid.toString();
  return `ipfs://${ipfscid}${ext || ''}`
}


/**
* Get URL redirects for shortend urls (ex: bit.ly)
* ==================================================
*/
export async function getRedirectedURL (url: string) {
  const shortners = [
    'bit.ly',
    'tinyurl.com',
    'rebrand.ly',
  ]
  const shortnersRegex = new RegExp(`^(?:http:\/\/|https:\/\/)?(?:${shortners.join('|')})\/`);
  const isShortened = shortnersRegex.test(url);
  if (!isShortened) return url;
  if (!/^(?:http:\/\/|https:\/\/)/.test(url)) url = `https://${url}`;

  try {
    const head = await axios.head(url);      
    // console.log(head)
    if (head?.request?.responseURL?.length) return head?.request.responseURL;
    return url;
  } 
  catch (e) {
    // console.log(e)
    return url;
  }
}