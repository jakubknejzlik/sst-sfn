import * as aws from "@pulumi/aws";
import { Chainable, StateBase, StateBaseParams } from "../state";

export interface MapStateParams extends StateBaseParams {
  ItemsPath?: string;
  Iterator: Chainable; // Iterator must be a state machine definition
}

export class Map extends StateBase {
  constructor(
    public name: string,
    protected params: MapStateParams
  ) {
    super(name, params);
  }

  toJSON() {
    return {
      ...super.toJSON(),
      Type: "Map",
      ...this.params,
      Iterator: this.params.Iterator.serializeToDefinition(),
    };
  }

  createPermissions(role: aws.iam.Role) {
    super.createPermissions(role);
    this.params.Iterator.createPermissions(role);
  }
}
