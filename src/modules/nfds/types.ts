import { NFDCategory, NFDSaleType, NFDState } from "./enums";


export interface NFDProps {
  // addons
  avatar?: string,
  // default
  appID?: number,
  asaID?: number,
  avatarOutdated?: boolean,
  caAlgo?: Array<string>,
  category?: NFDCategory,
  depositAccount?: string,
  matchCheck?: string,
  metaTags?: Array<string>,
  name: string,
  nfdAccount?: string,
  owner?: string,
  parentAppID?: number,
  properties?: {
    internal?: { [key: string]: string },
    userDefined?: { [key: string]: string },
    verified?: { [key: string]: string },
  },
  reservedFor?: string,
  saleType?: NFDSaleType,
  sellAmount?: number,
  state?: NFDState,
  unverifiedCa?: { [key: string]: Array<string>, },
  unverifiedCaAlgo?: Array<string>,
}



export type NFDQueryCallback = {
  full: boolean,
  resolve: ((PromiseLike) => void)
};