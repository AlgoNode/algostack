import type { Payload } from "../query/types";
import type AlgoStack from "../../index";
import { BaseModule } from "../_baseModule.js";
import merge from "lodash-es/merge.js";
import { AddonsConfigs, AddonsList, AddonsKeyMap, AddonsKey, AddonsKeys } from "./types.js";

export default class Addons extends BaseModule {
  private configs: AddonsConfigs = {};

  constructor(configs: AddonsConfigs = {}) {
    super();
    this.setConfigs(configs);
  }

  private _mapping: AddonsKeyMap = new Map();
  public get mapping() {
    return this._mapping;
  }
  public get(key: string) {
    const addons = this._mapping.get(key);
    return addons?.length ? new Map([[key, addons]]) : undefined;
  }

  public setConfigs(configs: AddonsConfigs) {
    if (configs.mapping) {
      this.register(configs.mapping)
      delete configs.mapping;
    }
    this.configs = merge(
      this.configs,
      configs
    );
  }

  /**
   * Init
   * ==================================================
   */
  public init(stack: AlgoStack) {
    super.init(stack);
    return this;
  }

  /**
   * Register addons to the lib
   * ==================================================
   */
  private register(addons: AddonsKeyMap) {
    addons.forEach((value, key) => {
      if (!this._mapping.has(key)) {
        this._mapping.set(key, value);
        return;
      }
      const merged = [...(this._mapping.get(key) || []), ...value];
      this._mapping.set(key, merged);
    });
  }

  /**
   * Iterate throught results
   * ==================================================
   */
  public async apply(
    data: Payload | Payload[],
    addons: AddonsList | AddonsKeyMap | AddonsKey | AddonsKeys
  ) {
    const isAddonsArray = Array.isArray(addons)
    // Array of callbacks
    const isAddonsFunctions = isAddonsArray && addons.every(addon => typeof addon === 'function')
    if (isAddonsFunctions) {
      await this.runAddon(data, addons);
      return;
    }
    // map of prop keys and callbacks
    const isAddonsMap = addons instanceof Map;
    if (isAddonsMap) {
      const dataKeys = Object.keys(data).filter((key) => addons.has(key));
      if (!dataKeys.length) return;
      await Promise.all(
        dataKeys.map((key) => this.runAddon(data[key], addons.get(key)))
      );
      return;
    }
    
    // single key
    const isAddonsKey = typeof addons === 'string';
    if (isAddonsKey) {
      const key = addons;
      const dataHasKey = this._mapping.has(key);
      if (!dataHasKey) return;
      await this.runAddon(data[key], this._mapping.get(key))
      return;
    }

    // array of keys
    const isAddonsKeys = isAddonsArray && addons.every(addon => typeof addon === 'string');
    if (isAddonsKeys) {
      const dataKeys = addons.filter(key => this._mapping.has(key));
      if (!dataKeys.length) return;
      await Promise.all(
        dataKeys.map((key) => this.runAddon(data[key], this._mapping.get(key)))
      );
      return;
    }

  }

  public async runAddon(data: Payload | Payload[], addons: AddonsList) {
    try {
      await Promise.all(
        (Array.isArray(data)? data: [data]).reduce(
          (promises, dataset) => [
            ...promises,
            ...addons.map((addon) => addon.call(this.stack, dataset)),
          ],
          []
        )
      );
    }
    catch (e) {
      console.log('An error occured while running addons.', e)
    }
  }
}