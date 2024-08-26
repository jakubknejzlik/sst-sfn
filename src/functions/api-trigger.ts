import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import { z } from "zod";

const client = new SFNClient();

const Event = z.record(z.unknown());

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const stateMachineArn = process.env.SFN_STATE_MACHINE;
    if (!stateMachineArn) {
      throw new Error("SFN_STATE_MACHINE environment variable is required");
    }

    const input = event.body ? Event.parse(JSON.parse(event.body)) : undefined;
    const command = new StartExecutionCommand({
      stateMachineArn,
      input: input ? JSON.stringify(input) : undefined,
    });
    const { executionArn, startDate } = await client.send(command);
    return {
      statusCode: 200,
      body: JSON.stringify({ executionArn, startDate }),
    };
  } catch (err) {
    return { statusCode: 500, body: err.message };
  }
};
