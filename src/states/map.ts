import * as aws from "@pulumi/aws";
import { Chainable, StateBase, StateBaseParams, Retriable } from "../state";
import { Input } from "@pulumi/pulumi";

export interface MapStateParams extends StateBaseParams {
  ItemsPath?: Input<string>;
  ItemSelector?: Input<object>;
  MaxConcurrency?: Input<number>;
  MaxConcurrencyPath?: Input<string>;
  Iterator: Chainable; // Iterator must be a state machine definition
}

export class Map extends StateBase implements Retriable {
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

  createPermissions(role: aws.iam.Role, prefix: string) {
    super.createPermissions(role, prefix);
    this.params.Iterator.createPermissions(role, prefix);
  }
}
