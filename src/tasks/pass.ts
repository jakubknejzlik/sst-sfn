import { StateBase, StateBaseParams } from "../state";

export interface PassParams extends StateBaseParams {
  Parameters?: Record<string, any>;
}
export class Pass extends StateBase {
  constructor(
    public name: string,
    protected params: PassParams = {}
  ) {
    super(name, params);
  }
  toJSON() {
    return {
      ...super.toJSON(),
      Type: "Pass",
      ...this.params,
    };
  }
}
