
/**
 * Available addons
 * ==================================================
 */
export enum Addon {
  NFDS = 'nfds',
  ICON = 'icon',
  DECODENOTES = 'decodeNotes',
  CATEGORY = 'category',
  ARCS = 'arcs',
  APPID = 'appId',
}

/**
 * Asset categories
 * ==================================================
 */
export enum AssetCategory {
  NFT = 'nft',
  TOKEN = 'token',
}

/**
 * Arcs standards
 * ==================================================
 */
export enum Arc {
  ARC3 = 'ARC3',
  ARC19 = 'ARC19',
  ARC30 = 'ARC30',
  ARC69 = 'ARC69',
}

/**
 * Note encoding
 * ==================================================
 */
export enum Encoding {
  NONE = 'none',
  TEXT = 'text',
  JSON = 'json',
  MSGPACK = 'msgpack',
  B64 = 'base64',
  B32 = 'base32',
  HEX = 'hex',
  UTF8 = 'utf8',
}