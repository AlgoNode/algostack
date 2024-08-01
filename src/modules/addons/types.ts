import { Payload } from "../../types.js";

export interface AddonsConfigs {
  mapping?: AddonsKeyMap;
}

export type AddonFn = (item: Payload) => void;
export type AddonsKeyMap = Map<string, AddonFn[]>;
export type AddonsList = AddonFn[];
export type AddonsKey = String;
export type AddonsKeys = AddonsKey[];
