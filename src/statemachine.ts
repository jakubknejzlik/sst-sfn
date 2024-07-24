import { permission } from ".sst/platform/src/components/aws/permission";
import {
  Component,
  Transform,
  transform,
} from ".sst/platform/src/components/component";
import { Link } from ".sst/platform/src/components/link";
import { prefixName } from ".sst/platform/src/components/naming";
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
      args.definition.createPermissions(role);
    }
    function getFirstChainable(chainable: Chainable): Chainable {
      if (chainable._prev) {
        return getFirstChainable(chainable._prev);
      }
      return chainable;
    }
    function createStateMachine() {
      return new sfn.StateMachine(
        `${name}StateMachine`,
        transform(args.transform?.stateMachine, {
          name: prefixName(256, name),
          definition: $jsonStringify({
            StartAt: getFirstChainable(args.definition).name,
            States: args.definition.serialize(),
          }),
          roleArn: role.arn,
        })
        // TODO: args.type needs to be added to known types in Component
        // { parent }
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
          resources: [this.stateMachine.arn],
        }),
      ],
    };
  }
}

const __pulumiType = "sst:aws:StateMachine";
// @ts-expect-error
StateMachine.__pulumiType = __pulumiType;
