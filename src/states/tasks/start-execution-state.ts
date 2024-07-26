import { Input } from "@pulumi/pulumi";
import { TaskStateBase, TaskStateBaseParams } from "./task-base";
import * as aws from "@pulumi/aws";

interface StartExecutionTaskParameters {
  Input: Record<string, Input<unknown>>;
  StateMachineArn: Input<string>;
}

export type StartExecutionParams = Omit<
  TaskStateBaseParams<StartExecutionTaskParameters>,
  "Resource"
>;

export class StartExecution extends TaskStateBase<StartExecutionTaskParameters> {
  constructor(
    public name: string,
    params: StartExecutionTaskParameters
  ) {
    super(name, {
      Resource: "arn:aws:states:::states:startExecution",
      Parameters: params,
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
            Action: ["states:StartExecution"],
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
