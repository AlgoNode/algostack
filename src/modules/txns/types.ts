export interface TxnsConfigs {
  wait?: boolean,
}

export type {
  AppClearStateTxn,
  AppCloseOutTxn,
  AppCreateTxn,
  AppDeleteTxn,
  AppNoOpTxn,
  AppOptInTxn,
  AppUpdateTxn,
  AssetConfigTxn,
  AssetCreateTxn,
  AssetDestroyTxn,
  AssetFreezeTxn,
  AssetTransferTxn,
  KeyRegistrationTxn,
  PaymentTxn,
  StateProofTxn,
  Transaction,
  TransactionLike,
  TransactionParams,
  TransactionSigner,
} from 'algosdk';
