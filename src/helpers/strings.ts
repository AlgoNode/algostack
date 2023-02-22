// Integers
export function isIntegers(str: string) {
  return /^\d+$/.test(str);
}

// Asset ID = integers, max 19 characters
// https://github.com/algorand/js-algorand-sdk/blob/cfd5b8891e2e44f1c546e4db734f8287e9a6ef72/src/transaction.ts#L25
export function isAssetId(str: string) {
  return /^\d{1,19}$/.test(str);
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
// hhttps://github.com/algorand/js-algorand-sdk/blob/cfd5b8891e2e44f1c546e4db734f8287e9a6ef72/src/encoding/address.ts#L10
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
export function isUrl(str: string) {
  const urlPattern = new RegExp('^(https?:\\/\\/)?'+ // validate protocol
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // validate domain name
    '((\\d{1,3}\\.){3}\\d{1,3}))'+ // validate OR ip (v4) address
    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // validate port and path
    '(\\?[;&a-z\\d%_.~+=-]*)?'+ // validate query string
    '(\\#[-a-z\\d_]*)?$','i'); // validate fragment locator
  return urlPattern.test(str);
}