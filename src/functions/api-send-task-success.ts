import { SendTaskSuccessCommand, SFNClient } from "@aws-sdk/client-sfn";
import { z } from "zod";

import { APIGatewayProxyHandlerV2 } from "aws-lambda";

const client = new SFNClient();

// const EventPathParams = z.object({ taskToken: z.string() });
// const EventBody = z.record(z.unknown());
const EventBody = z.object({
  taskToken: z.string(),
  output: z.record(z.unknown()).nullish(),
});

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const { taskToken, output } = EventBody.parse(
      event.body ? JSON.parse(event.body) : {}
    );
    const command = new SendTaskSuccessCommand({
      taskToken,
      output: JSON.stringify(output ?? {}),
    });
    await client.send(command);
    return {
      statusCode: 204,
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
