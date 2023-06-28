import AlgoStack from "../index.js";


export class BaseModule {
  public options: Record<string,any>;
  protected stack: AlgoStack;

  public init(stack: AlgoStack) {
    this.stack = stack;
    return this;
  }
}