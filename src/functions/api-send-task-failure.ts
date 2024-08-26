import { SendTaskFailureCommand, SFNClient } from "@aws-sdk/client-sfn";
import { z } from "zod";

import { APIGatewayProxyHandlerV2 } from "aws-lambda";

const client = new SFNClient();

const EventBody = z.object({
  taskToken: z.string(),
  error: z.string().optional(),
  cause: z.string().optional(),
});

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const { taskToken, error, cause } = EventBody.parse(
      event.body ? JSON.parse(event.body) : {}
    );
    const command = new SendTaskFailureCommand({
      taskToken,
      error,
      cause,
    });
    await client.send(command);
    return {
      statusCode: 204,
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
