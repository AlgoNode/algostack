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
  currentAsOfBlock?: number;
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
  seller?: string;
  sigNameAddress?: string;
  state?: NFDState,
  tags?: Array<string>;
  timeChanged?: Date;
  timeCreated?: Date;
  timePurchased?: Date;
  unverifiedCa?: { [key: string]: Array<string>, },
  unverifiedCaAlgo?: Array<string>,

  score?: number,
}



export type NFDQueryCallback = {
  full: boolean,
  resolve: ((PromiseLike) => void)
};