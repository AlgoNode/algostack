export { isValidAddress } from 'algosdk';
// Integers
export function isIntegers(str: string) {
  return /^\d+$/.test(str);
}

// Asset ID = integers, max 19 characters
// https://github.com/algorand/js-algorand-sdk/blob/cfd5b8891e2e44f1c546e4db734f8287e9a6ef72/src/transaction.ts#L25
export function isAssetId(str: string) {
  return /^\d{1,14}$/.test(str);
}

export function isAppId(str: string) {
  return /^\d{1,14}$/.test(str);
}

// String contain spaces = Asset name
export function containsSpaces(str: string) {
  return /\s/.test(str);
}

// Contains .algo = Domain 
export function isDomain(str: string) {
  return /\.algo$/.test(str);
}

// Base32 Hash (58 chars = account)
// https://github.com/algorand/js-algorand-sdk/blob/cfd5b8891e2e44f1c546e4db734f8287e9a6ef72/src/encoding/address.ts#L10
export function isAddress(str: string) {
  return /^([A-Z2-7]{58})+$/.test(str);
}

// Base32 Hash (52 chars = transaction)
// https://github.com/algorand/js-algorand-sdk/blob/cfd5b8891e2e44f1c546e4db734f8287e9a6ef72/src/transaction.ts#L22
export function isTransaction(str: string) {
  return /^([A-Z2-7]{52})+$/.test(str);
}


// check if string is a valid url
// https://www.freecodecamp.org/news/check-if-a-javascript-string-is-a-url/
const urlPattern = new RegExp('^(https?:\\/\\/)?'+ // validate protocol
  '(([a-z\\d-]*\\.)+[a-z]{2,}|'+ // validate domain name
  '((\\d{1,3}\\.){3}\\d{1,3}))'+ // validate OR ip (v4) address
  '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // validate port and path
  '(\\?[;&a-z\\d%_.~+=-]*)?'+ // validate query string
  '(\\#[-a-z\\d_]*)?$','i'); // validate fragment locator
export function isUrl(str: string) {
  return urlPattern.test(str);
}

// url is a domain base (no files at thte end)
const domainPattern = /^(https?:\/\/)?([a-z\d-]*\.)+[a-z]{2,}\/?$/i; // optionnal trailing slash
export function isDomainUrl(str: string) {
  return domainPattern.test(str);
}

// check for ipfs protocol
export function isIpfsProtocol(url:string){
  return /^ipfs:\/\//.test(url);
}

// check for ipfs subdomain
export function isIpfsSubdomain(url:string){
  return /^(?:http:\/\/|https:\/\/)([a-zA-z0-9]+)(\.ipfs\.)(.+)[a-z]{2,}/.test(url);
}

// check if string is a media file url
const extensions = {
  image: [ 'bmp','gif','ico','jpg','jpeg','png','svg','tif','tiff','webp' ],
  video: [ 'avi','h264','m4v','mkv','mov','mp4','mpg','mpeg','ogv','webm','wmv' ],
  audio: [ 'aif','mid','midi','mp3','mpa','ogg','wav','wma' ],
  application: [ 'json' ],
}

const allExtensions = [
  ...extensions.image,
  ...extensions.video,
  ...extensions.audio,
  ...extensions.application,
];

const imageUrlPattern = new RegExp(`\.(${extensions.image.join('|')})$`,'i');
const videoUrlPattern = new RegExp(`\.(${extensions.video.join('|')})$`,'i');
const audioUrlPattern = new RegExp(`\.(${extensions.audio.join('|')})$`,'i');
const allMediasUrlPattern = new RegExp(`\.(${allExtensions.join('|')})$`,'i');

export function isImageFileUrl(str: string) {
  return isUrl(str) && imageUrlPattern.test(str);
}
export function isVideoFileUrl(str: string) {
  return isUrl(str) && videoUrlPattern.test(str);
}
export function isAudioFileUrl(str: string) {
  return isUrl(str) && audioUrlPattern.test(str);
}
export function isMediaFileUrl(str: string) {
  return isUrl(str) && allMediasUrlPattern.test(str);
}


// get mime/type from url file extension
export function getContentTypeFromUrl(url: string) {
  const matched = url.match(/\.(\w{3,5})($|#|\?)/i);
  if (!matched) return undefined;
  const ext = matched[2];
  let mime: string;
  Object.entries(extensions).forEach(([category, extensions]) => {
    if (extensions.includes(ext)) mime = `${category}/${ext}`;
  });
  return mime;
}
