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