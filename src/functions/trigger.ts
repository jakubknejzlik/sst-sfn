import {
  SFNClient,
  StartExecutionCommand,
  SendTaskSuccessCommand,
} from "@aws-sdk/client-sfn";
import { z } from "zod";

const client = new SFNClient();

const Event = z.object({
  stateMachineArn: z.string(),
  input: z.record(z.unknown()).optional(),
});

export const handler = async (event: unknown) => {
  console.log("?trigger:", event);
  const { stateMachineArn, input } = Event.parse(event);
  const command = new StartExecutionCommand({
    stateMachineArn,
    input: input ? JSON.stringify(input) : undefined,
  });
  return client.send(command);
};
