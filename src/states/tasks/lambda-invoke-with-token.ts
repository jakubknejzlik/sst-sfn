import { Input } from "@pulumi/pulumi";
import { $$ } from "../../jsonpath";
import { LambdaInvoke } from "./lambda-invoke";
import { TaskStateBaseParams } from "./task-base";

type LambdaInvokeTaskParameters = {
  FunctionName: Input<string>;
  Payload?: Record<string, Input<unknown>>;
};

export class LambdaInvokeWaitForTaskToken extends LambdaInvoke {
  constructor(
    public name: string,
    params: Omit<TaskStateBaseParams<LambdaInvokeTaskParameters>, "Resource">
  ) {
    const { Parameters, ...rest } = params;
    super(name, {
      Resource: `arn:aws:states:::lambda:invoke.waitForTaskToken`,
      Parameters: {
        Payload: {
          "taskToken.$": $$.Task.Token,
        },
        ...Parameters,
      },
      ...rest,
    });
  }
}
