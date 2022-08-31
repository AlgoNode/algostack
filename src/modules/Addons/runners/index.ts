import Arcs from './Arcs.js';
import Category from './Category.js';
import AssetNFDs from './AssetNFDs.js';
import TxnNote from './TxnNote.js';

const assetRunners = {
  category: Category,
  arcs: Arcs,
  nfds: AssetNFDs,
};

const txnRunners = {
  note: TxnNote,
};

export default {
  asset: assetRunners,
  assets: assetRunners,
  transaction: txnRunners,
  transactions: txnRunners,
}