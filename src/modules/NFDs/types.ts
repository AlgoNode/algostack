export type NFDString = `${string}.algo`;
export type NFDList = NFDString[];

export type AddressString = string;
export type AddressesList = AddressString[];

export type AddressesMap = Record<string, NFDList>;

export type NFDQueryCallback = ((PromiseLike) => void);
export interface NFDQuery {
  address: AddressString,
  callbacks: NFDQueryCallback[]
}