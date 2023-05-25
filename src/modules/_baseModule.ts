import AlgoStack from "../index.js";
import { ModuleOptions } from "../types.js";


export class BaseModule {
  public options: ModuleOptions;
  protected stack: AlgoStack;

  public init(stack: AlgoStack) {
    this.stack = stack;
    return this;
  }
}