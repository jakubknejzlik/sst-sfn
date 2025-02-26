import { Input } from "@pulumi/pulumi";
import { TaskStateBase, TaskStateBaseParams } from "./task-base";
import { $$ } from "../../jsonpath";

type SQSSendMessageWithTokenTaskParameters = {
  MessageBody?: Record<string, Input<unknown>>;
  MessageAttributes?: Record<string, Input<unknown>>;
};

type Parameters = Omit<
  TaskStateBaseParams<SQSSendMessageWithTokenTaskParameters>,
  "Resource"
> &
  Partial<
    Pick<TaskStateBaseParams<SQSSendMessageWithTokenTaskParameters>, "Resource">
  >;

export class SQSSendMessageWithToken extends TaskStateBase<
  SQSSendMessageWithTokenTaskParameters & { QueueUrl: Input<string> }
> {
  constructor(
    public name: string,
    public queue: sst.aws.Queue,
    params: Parameters
  ) {
    const { Parameters, ...rest } = params;
    const { MessageBody, ...restParams } = Parameters;
    super(name, {
      Resource: `arn:aws:states:::sqs:sendMessage.waitForTaskToken`,
      Parameters: {
        QueueUrl: queue.url,
        MessageBody: {
          "taskToken.$": $$.Task.Token,
          ...MessageBody,
        },
        ...restParams,
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
