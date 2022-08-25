import type { IndexerResponse } from '../../Query/index.js';
import { AssetType } from '../enums';

/**
 * Get Asset  Type
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