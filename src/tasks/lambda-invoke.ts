import { TaskStateBase, TaskStateBaseParams } from "./task-base";

export type LambdaInvokeParams = Omit<TaskStateBaseParams, "Resource"> & {
  Payload?: Record<string, any>;
};
export class LambdaInvoke extends TaskStateBase {
  constructor(
    public name: string,
    protected fn: sst.aws.Function,
    params: LambdaInvokeParams = {}
  ) {
    super(name, { Resource: fn.arn, ...params });
  }

  createPermissions(role: aws.iam.Role) {
    super.createPermissions(role);
    new aws.iam.RolePolicy("SfnRolePolicy", {
      role: role.id,
      policy: {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: ["lambda:InvokeFunction"],
            Resource: this.fn.arn,
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
