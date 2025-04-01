export const $ = {
  DISCARD: null,
  stringAt: (key: string) => key,
  format(format: string, ...args: string[]) {
    return `States.Format('${format}', ${args.join(", ")})`;
  },
  jsonToString(key: string) {
    return `States.JsonToString(${key})`;
  },
};

export const $$ = {
  Execution: {
    Id: "$$.Execution.Id",
    StartTime: "$$.Execution.StartTime",
  },
  Task: {
    Token: "$$.Task.Token",
  },
  Map: {
    Item: {
      Value: "$$.Map.Item.Value",
    },
  },
};
