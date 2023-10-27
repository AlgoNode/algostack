import AlgoStack from "../index.js";
import { BaseConfigs } from "../utils/configs.js";


export class BaseModule {
  protected stack: AlgoStack;

  public init(stack: AlgoStack) {
    this.stack = stack;
    return this;
  }

  public setConfigs(configs: BaseConfigs) {}
}