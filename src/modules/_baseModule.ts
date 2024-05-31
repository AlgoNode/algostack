import AlgoStack from "../index.js";
import type { PromiseResolver } from "../types.js";
import { BaseConfigs } from "../utils/configs.js";


export class BaseModule {
  protected stack: AlgoStack;
  private _initQueue: PromiseResolver[];
  private _initiated: boolean;
  protected get initiated() { return this._initiated }

  constructor() {
    this._initiated = false;
    this._initQueue = [];
  }

  /**
  * Initiator
  * ==================================================
  */
  public init(stack: AlgoStack) {
    this.stack = stack;
    setTimeout(this.resolveInit.bind(this), 0); // revilve init on the next cycle
    return this;
  }
  protected async waitForInit() {
    if (this.initiated) return;
    await new Promise((resolve) => {
      this._initQueue.push(resolve);
    });
  }
  private resolveInit() {
    this._initiated = true;
    for(const resolve of this._initQueue) {
      resolve();
    }
    this._initQueue = [];
  }

  /**
  * Configs
  * ==================================================
  */
  public setConfigs(configs: BaseConfigs) {}
}