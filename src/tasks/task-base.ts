import { Input } from "@pulumi/pulumi";
import { StateBase, StateBaseParams } from "../state";

export interface TaskStateBaseParams extends StateBaseParams {
  Resource?: Input<string>;
}
export class TaskStateBase extends StateBase {
  constructor(
    public name: string,
    protected params: TaskStateBaseParams = {}
  ) {
    super(name, params);
  }
  toJSON() {
    return {
      ...super.toJSON(),
      Type: "Task",
      ...this.params,
    };
  }
  createPermissions(role: aws.iam.Role) {
    super.createPermissions(role);
  }
}
