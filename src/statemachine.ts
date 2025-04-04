import {
  ApiGatewayV2,
  ApiGatewayV2RouteArgs,
  CronArgs,
} from "./.sst/platform/src/components/aws";
import { ApiGatewayV2LambdaRoute } from "./.sst/platform/src/components/aws/apigatewayv2-lambda-route";
import { permission } from "./.sst/platform/src/components/aws/permission";
import {
  Component,
  Transform,
  transform,
} from "./.sst/platform/src/components/component";
import { Link } from "./.sst/platform/src/components/link";
import { physicalName } from "./.sst/platform/src/components/naming";

import aws, { sfn } from "@pulumi/aws";
import { EventRuleArgs } from "@pulumi/aws/cloudwatch";
import { StateMachineArgs } from "@pulumi/aws/sfn";
import { ComponentResourceOptions, output, Output } from "@pulumi/pulumi";
import { Chainable } from "./state";

const region = aws.config.requireRegion();

type SFNArgs = Partial<Omit<StateMachineArgs, "definition">> & {
  definition: Chainable;
  /**
   * [Transform](/docs/components#transform) how this component creates its underlying
   * resources.
   */
  transform?: {
    /**
     * Transform the EventBus resource.
     */
    stateMachine?: Transform<sfn.StateMachineArgs>;
  };
};

export class StateMachine extends Component implements Link.Linkable {
  private stateMachine: Output<sfn.StateMachine>;
  private startExecutionRole?: aws.iam.Role;
  static __pulumiType: string;

  constructor(
    private name: string,
    args: SFNArgs,
    opts?: ComponentResourceOptions
  ) {
    super(__pulumiType, name, args, opts);

    const role = args.roleArn
      ? aws.iam.Role.get(
          `${$app.name}-${$app.stage}-${name}SfnRole`,
          args.roleArn
        )
      : new aws.iam.Role(`${name}SfnRole`, {
          name: `${$app.name}-${$app.stage}-${name}`,
          assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
            Service: `states.${region}.amazonaws.com`,
          }),
        });

    this.stateMachine = output(createStateMachine());
    createPermissions();

    function createPermissions() {
      new aws.iam.RolePolicy(`${name}SfnRolePolicy`, {
        role: role.id,
        policy: {
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Action: ["events:*"],
              Resource: "*",
            },
          ],
        },
      });
      args.definition.createPermissions(role, name);
    }

    function createStateMachine() {
      return new sfn.StateMachine(
        ...transform(
          args.transform?.stateMachine,
          `${name}StateMachine`,
          {
            name: physicalName(256, name),
            definition: $jsonStringify(args.definition.serializeToDefinition()),
            roleArn: role.arn,
          },
          // TODO: args.type needs to be added to known types in Component
          // { parent }
          {}
        )
      );
    }
  }

  /** @internal */
  public getSSTLink() {
    return {
      properties: {
        id: this.id,
        arn: this.arn,
      },
      include: [
        permission({
          actions: ["states:*"],
          resources: [
            this.stateMachine.arn,
            $interpolate`${this.stateMachine.arn.apply((arn) =>
              arn.replace("stateMachine", "execution")
            )}:*`,
          ],
        }),
      ],
    };
  }

  /**
   * The State Machine ID.
   */
  public get id() {
    return this.stateMachine.id;
  }

  /**
   * The State Machine ARN.
   */
  public get arn() {
    return this.stateMachine.arn;
  }

  getStartExecutionRole(): aws.iam.Role {
    if (this.startExecutionRole) {
      return this.startExecutionRole;
    }
    const roleName = `${$app.name}-${$app.stage}-${this.name}-StartExecutionRole`;
    const policyName = `${$app.name}-${$app.stage}-${this.name}-StartExecutionRolePolicy`;
    this.startExecutionRole = new aws.iam.Role(roleName, {
      name: roleName,
      assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Action: "sts:AssumeRole",
            Effect: "Allow",
            Sid: "",
            Principal: {
              Service: "events.amazonaws.com",
            },
          },
          {
            Action: "sts:AssumeRole",
            Effect: "Allow",
            Sid: "",
            Principal: {
              Service: "apigateway.amazonaws.com",
            },
          },
        ],
      }),
    });
    new aws.iam.RolePolicy(policyName, {
      name: policyName,
      role: this.startExecutionRole.id,
      policy: $jsonStringify({
        Version: "2012-10-17",
        Statement: [
          {
            Action: ["states:StartExecution"],
            Effect: "Allow",
            Resource: this.stateMachine.arn,
          },
        ],
      }),
    });
    return this.startExecutionRole;
  }

  public addCronTrigger(
    name: string,
    schedule: CronArgs["schedule"],
    input?: Record<string, unknown>
  ): aws.cloudwatch.EventRule {
    const rule = new aws.cloudwatch.EventRule(name, {
      name: `${$app.name}-${$app.stage}-${name}`,
      description: $interpolate`Cron trigger for State Machine ${this.stateMachine.name}`,
      scheduleExpression: schedule,
    });
    new aws.cloudwatch.EventTarget(name, {
      rule: rule.name,
      arn: this.stateMachine.arn,
      roleArn: this.getStartExecutionRole().arn,
      input: $jsonStringify(input),
    });
    return rule;
  }

  public addEventBridgeTrigger(
    name: string,
    eventPattern: EventRuleArgs["eventPattern"]
  ): aws.cloudwatch.EventRule {
    const rule = new aws.cloudwatch.EventRule(name, {
      name: `${$app.name}-${$app.stage}-${name}`,
      description: $interpolate`Event trigger for State Machine ${this.stateMachine.name}`,
      eventPattern,
    });
    new aws.cloudwatch.EventTarget(name, {
      rule: rule.name,
      arn: this.stateMachine.arn,
      roleArn: this.getStartExecutionRole().arn,
    });
    return rule;
  }

  public addApiGatewayV2Trigger(
    rawRoute: string,
    api: ApiGatewayV2,
    routeArgs: ApiGatewayV2RouteArgs = {}
  ) {
    const apiId = api.url.apply((url) => {
      const match = url.match(/https:\/\/(\w+)\.execute-api.*/);
      return match?.[1] ?? "";
    });

    const { transform, ...restRouteArgs } = routeArgs;
    const { integration, ...restTransformArgs } = transform ?? {};

    api.route(rawRoute, "dummy.handler", {
      transform: {
        integration: {
          apiId: apiId,
          description: "Send event to EventProcessor",
          integrationType: "AWS_PROXY",
          integrationSubtype: "StepFunctions-StartExecution",
          payloadFormatVersion: "1.0",
          integrationUri: undefined, // has to be undefined for AWS_PROXY
          credentialsArn: this.getStartExecutionRole().arn,
          timeoutMilliseconds: 5000,
          requestParameters: {
            StateMachineArn: this.stateMachine.arn,
            Input: "$request.body",
          },
          ...integration,
        },
        ...restTransformArgs,
      },
      ...restRouteArgs,
    });
  }

  public addApiGatewayV2TaskCommandSuccessHandler(
    rawRoute: string,
    api: ApiGatewayV2
  ): ApiGatewayV2LambdaRoute {
    return this.addApiGatewayV2TaskCommandHandler("success", rawRoute, api);
  }
  public addApiGatewayV2TaskCommandFailureHandler(
    rawRoute: string,
    api: ApiGatewayV2
  ): ApiGatewayV2LambdaRoute {
    return this.addApiGatewayV2TaskCommandHandler("failure", rawRoute, api);
  }
  protected addApiGatewayV2TaskCommandHandler(
    command: "success" | "failure",
    rawRoute: string,
    api: ApiGatewayV2
  ): ApiGatewayV2LambdaRoute {
    return api.route(rawRoute, {
      // TODO: handler path should be relative to the root of the project
      handler: `packages/sst-sfn/src/functions/api-send-task-${command}.handler`,
      memory: "128 MB",
      link: [this],
    });
  }
}

const __pulumiType = "sst:aws:StateMachine";
StateMachine.__pulumiType = __pulumiType;
