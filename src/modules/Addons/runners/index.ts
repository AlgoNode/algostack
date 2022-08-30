import Arcs from './Arcs.js';
import Category from './Category.js';
import AssetNFDs from './AssetNFDs.js';

const assetRunners = {
  category: Category,
  arcs: Arcs,
  nfds: AssetNFDs,
};

export default {
  asset: assetRunners,
  assets: assetRunners,
}