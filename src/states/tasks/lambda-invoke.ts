import { Input } from "@pulumi/pulumi";
import { TaskStateBase } from "./task-base";

type LambdaInvokeTaskParameters = {
  FunctionName: Input<string>;
  Payload?: Record<string, Input<unknown>>;
};

export class LambdaInvoke extends TaskStateBase<LambdaInvokeTaskParameters> {
  constructor(
    public name: string,
    params: LambdaInvokeTaskParameters
  ) {
    super(name, {
      Resource: "arn:aws:states:::lambda:invoke",
      Parameters: params,
    });
  }

  private createRolePolicy(role: aws.iam.Role) {
    return new aws.iam.RolePolicy(`${this.name}SfnRolePolicy`, {
      role: role.id,
      policy: {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: ["lambda:InvokeFunction"],
            Resource: $output(this.params).apply(
              (p) => p.Parameters.FunctionName
            ),
          },
        ],
      },
    });
  }

  createPermissions(role: aws.iam.Role) {
    super.createPermissions(role);
    this.createRolePolicy(role);
  }

  toJSON() {
    return {
      ...super.toJSON(),
    };
  }
}
