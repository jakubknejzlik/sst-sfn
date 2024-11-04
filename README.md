# sst-sfn

StepFunctions implementation for SST Ion (and Pulumi)

## Important!

For now this package contains copy of SST platform scripts (https://github.com/sst/sst/issues/4643)

# Example

```typescript
import { $, $$, LambdaInvoke, LambdaInvokeWaitForTaskToken, Map, StartExecutionSync, StateMachine } from "path/to/sst-sfn";

const search = new sst.aws.Function("GoogleSearch", {...})
const exportZip = new sst.aws.Function("ExportZip", {...})
const tokenExample = new sst.aws.Function("TokenExample", {...})

export const fetchDetailStateMachine = new StateMachine("MyStateMachine", {...});

const definition = new LambdaInvoke("Search", {
    Parameters: {
      FunctionName: search.arn,
      Payload: {
        "query.$": $.stringAt("$.query"),
        "s3Key.$": $.format("executions/{}/", $$.Execution.Id),
      },
    },
    ResultPath: $.stringAt("$.searchResults"),
  })
    .next(
      new Map("MapGoogleResults", {
        ItemsPath: "$.searchResults.Payload",
        Iterator: new StartExecutionSync("FetchDetail", {
          Parameters: {
            StateMachineArn: fetchDetailStateMachine.arn,
            Input: {
              "url.$": $.stringAt("$.url"),
              "executionId.$": $$.Execution.Id,
            },
          },
        }),
      })
    )
    .next(
      new LambdaInvoke("ExportZip", {
        Parameters: {
          FunctionName: exportZip.arn,
          Payload: {
            "input.$": $.stringAt('$')
          },
        },
        ResultPath: $.stringAt("$.archive"),
      })
    ).next(
      new LambdaInvokeWaitForTaskToken("TokenExample", {
        Parameters: {
          FunctionName: tokenExample.arn,
          Payload: {
            "taskToken.$": $$.Task.Token
          },
        },
        ResultPath: $.DISCARD,
      })
    )

export const searchStateMachine = new StateMachine("MyStateMachine", {
  definition
});
```

## API Gateway V2 helpers

Set of convenience methods to help with 3rd party integration using API Gateway V2

```typescript
export const maApi = new sst.aws.ApiGatewayV2("MyApi");

export const myStateMachine = new StateMachine("MyStateMachine", {
  definition: //
});

// trigger new state machine using POST request
// curl '.../my-trigger' --data '{"hello":"world"}' => body is passed to state machine as input
myStateMachine.addApiGatewayV2Trigger("POST /my-trigger", maApi);

// send success command using taskToken
// curl '.../my-success' --data '{"taskToken":"[TOKEN]","output":{"foo":"blah"}}'
myStateMachine.addApiGatewayV2TaskCommandSuccessHandler("POST /my-success", maApi);

// send failure command using taskToken
// curl '.../my-success' --data '{"taskToken":"[TOKEN]","error":"XYZ","cause":"somthing is broken"}'
myStateMachine.addApiGatewayV2TaskCommandFailureHandler("POST /failure", maApi);

```
