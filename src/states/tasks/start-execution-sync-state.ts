import { Input } from "@pulumi/pulumi";
import { TaskStateBase, TaskStateBaseParams } from "./task-base";
import * as aws from "@pulumi/aws";
import { $$ } from "../../jsonpath";

interface StartExecutionSyncTaskParameters {
  Input: Record<string, Input<unknown>>;
  StateMachineArn: Input<string>;
}

export type StartExecutionSyncParams = Omit<
  TaskStateBaseParams<StartExecutionSyncTaskParameters>,
  "Resource"
>;

export class StartExecutionSync extends TaskStateBase<StartExecutionSyncTaskParameters> {
  constructor(
    public name: string,
    params: Omit<
      TaskStateBaseParams<StartExecutionSyncTaskParameters>,
      "Resource"
    >
  ) {
    const { Parameters, ...rest } = params;
    const { Input, ...restParams } = Parameters;
    super(name, {
      Resource: "arn:aws:states:::states:startExecution.sync:2",
      Parameters: {
        Input: { ...Input, "token.$": $$.Task.Token },
        ...restParams,
      },
      ...rest,
    });
  }

  createPermissions(role: aws.iam.Role, prefix: string) {
    super.createPermissions(role, prefix);
    new aws.iam.RolePolicy(`${this.name}SfnRolePolicy`, {
      role: role.id,
      policy: {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: ["states:*"],
            Resource: this.params.Parameters.StateMachineArn,
          },
        ],
      },
    });
  }

  toJSON() {
    return {
      ...super.toJSON(),
    };
  }
}
