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

    // const parent = this;

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
              // arn:${AWS::Partition}:events:${AWS::Region}:${AWS::AccountId}:rule/StepFunctionsGetEventsForStepFunctionsExecutionRule
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
            $interpolate`${this.stateMachine.arn.apply((arn) => arn.replace("stateMachine", "execution"))}:*`,
          ],
        }),
      ],
    };
  }
}

const __pulumiType = "sst:aws:StateMachine";
StateMachine.__pulumiType = __pulumiType;
