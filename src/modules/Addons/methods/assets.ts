import type { IndexerResponse } from '../../Query/index.js';
import { AssetType, Arc } from '../enums.js';

/**
 * Get Asset Type
 * ==================================================
 */
export function assetType (data: IndexerResponse) {
  if (!data.params) return;
  if (data.params.total === 1) {
    data.addons.type = AssetType.NFT;
    return;
  }
  if (data.params.total > 10000) {
    data.addons.type = AssetType.TOKEN;
    return;
  }
  data.addons.type = undefined;
}


/**
 * Get ARCS used on an asset
 * ==================================================
 */
export function arcs (data: IndexerResponse) {
  if (!data.params) return;
  if (!data.addons.arcs) data.addons.arcs = [];
  const url = data.params.url;
  if (!Boolean(url)) return;
  // ARC 3
  if ( /(#arc3|@arc3)$/.test(url) ) {
    data.addons.arcs.push(Arc.ARC3);
  }
  // ARC 19
  if (url.startsWith('template-ipfs://')) {
    data.addons.arcs.push(Arc.ARC19);
  }
  // ARC 3
  if ( /(#i|#v|#a|#p|#h)$/.test(url) ) {
    data.addons.arcs.push(Arc.ARC69);
  }
}