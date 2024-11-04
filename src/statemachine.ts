import { ApiGatewayV2, CronArgs } from ".sst/platform/src/components/aws";
import { ApiGatewayV2LambdaRoute } from ".sst/platform/src/components/aws/apigatewayv2-lambda-route";
import { permission } from ".sst/platform/src/components/aws/permission";
import {
  Component,
  Transform,
  transform,
} from ".sst/platform/src/components/component";
import { Link } from ".sst/platform/src/components/link";
import { physicalName } from ".sst/platform/src/components/naming";

import { sfn } from "@pulumi/aws";
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
  static __pulumiType: string;

  constructor(name: string, args: SFNArgs, opts?: ComponentResourceOptions) {
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

  public addCronTrigger(
    name: string,
    schedule: CronArgs["schedule"],
    input?: Record<string, unknown>
  ): sst.aws.Cron {
    return new sst.aws.Cron(name, {
      schedule,
      job: {
        // TODO: handler path should be relative to the root of the project
        // handler: join(__dirname, "./functions/trigger.handler"),
        handler: "packages/sst-sfn/src/functions/trigger.handler",
        link: [this],
      },
      transform: {
        target: {
          input: $jsonStringify({ stateMachineArn: this.arn, input }),
        },
      },
    });
  }

  public addApiGatewayV2Trigger(
    rawRoute: string,
    api: ApiGatewayV2
  ): ApiGatewayV2LambdaRoute {
    return api.route(rawRoute, {
      // TODO: handler path should be relative to the root of the project
      handler: "packages/sst-sfn/src/functions/api-trigger.handler",
      environment: {
        SFN_STATE_MACHINE: this.arn,
      },
      link: [this],
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
