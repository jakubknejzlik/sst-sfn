import { Input } from "@pulumi/pulumi";
import { TaskStateBase, TaskStateBaseParams } from "./task-base";

type SQSSendMessageTaskParameters = {
  MessageBody?: Record<string, Input<unknown>>;
  MessageAttributes?: Record<string, Input<unknown>>;
};

type Parameters = Omit<
  TaskStateBaseParams<SQSSendMessageTaskParameters>,
  "Resource"
> &
  Partial<Pick<TaskStateBaseParams<SQSSendMessageTaskParameters>, "Resource">>;

export class SQSSendMessage extends TaskStateBase<
  SQSSendMessageTaskParameters & { QueueUrl: Input<string> }
> {
  constructor(
    public name: string,
    public queue: sst.aws.Queue,
    params: Parameters
  ) {
    const { Parameters, ...rest } = params;
    super(name, {
      Resource: `arn:aws:states:::sqs:sendMessage`,
      Parameters: {
        QueueUrl: queue.url,
        ...Parameters,
      },
      ...rest,
    });
  }

  private createRolePolicy(role: aws.iam.Role, prefix: string) {
    new aws.iam.RolePolicy(`${prefix}${this.name}SfnRolePolicy`, {
      role: role.id,
      policy: {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: ["sqs:SendMessage"],
            Resource: this.queue.arn,
          },
        ],
      },
    });
  }

  createPermissions(role: aws.iam.Role, prefix: string) {
    super.createPermissions(role, prefix);
    this.createRolePolicy(role, prefix);
  }

  toJSON() {
    return {
      ...super.toJSON(),
    };
  }
}
