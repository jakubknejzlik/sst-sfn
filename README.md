# sst-sfn

StepFunctions implementation for SST Ion (and Pulumi)

# Example

```
import { $, $$, LambdaInvoke, Map, StartExecutionSync, StateMachine } from "path/to/sst-sfn";

const search = new sst.aws.Function("GoogleSearch", {...})
const exportZip = new sst.aws.Function("ExportZip", {...})

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
    )

export const searchStateMachine = new StateMachine("MyStateMachine", {
  definition
});
```
