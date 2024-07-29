import { Input } from "@pulumi/pulumi";
import { StateBase, StateBaseParams } from "../../state";

export interface TaskStateBaseParams<TP> extends StateBaseParams {
  Resource: Input<string>;
  Parameters: TP;
}

export class TaskStateBase<TP> extends StateBase {
  constructor(
    public name: string,
    protected params: TaskStateBaseParams<TP>
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
