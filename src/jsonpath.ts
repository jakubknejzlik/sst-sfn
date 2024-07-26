export const $ = {
  DISCARD: null,
  stringAt: (key: string) => key,
  format(format: string, ...args: string[]) {
    return `States.Format('${format}', ${args.join(", ")})`;
  },
};

export const $$ = {
  Execution: {
    Id: "$$.Execution.Id",
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
