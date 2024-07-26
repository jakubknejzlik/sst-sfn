import { Input } from "@pulumi/pulumi";

export interface Chainable {
  name: string;
  _prev?: Chainable;
  next: (state: Chainable) => Chainable;
  toJSON: () => object;
  serialize: () => object;
  createPermissions: (role: aws.iam.Role, namePrefix: string) => void;
  firstNode: () => Chainable;
  serializeToDefinition: () => object;
}

type RetryProps = {
  ErrorEquals: string[];
  IntervalSeconds?: number;
  MaxAttempts?: number;
  BackoffRate?: number;
};
export interface Retriable {
  addRetry: (retry?: RetryProps) => Chainable;
}

export interface StateBaseParams {
  ResultPath?: Input<string | null>;
  ResultSelector?: Input<object>;
  OutputPath?: Input<string>;
  Comment?: Input<string>;
  InputPath?: Input<string>;
}

export class StateBase implements Chainable {
  public _prev?: Chainable;
  public _nextName?: string;
  protected _retries?: RetryProps[];

  addRetry(
    retry: RetryProps = {
      ErrorEquals: ["States.ALL"],
      BackoffRate: 2,
      IntervalSeconds: 1,
      MaxAttempts: 3,
    }
  ) {
    this._retries = this._retries || [];
    this._retries.push(retry);
    return this;
  }

  constructor(
    public name: string,
    protected params: StateBaseParams = {}
  ) {}

  public next(state: Chainable) {
    this._nextName = state.name;
    state._prev = this;
    return state;
  }

  serialize() {
    return {
      ...this._prev?.serialize(),
      [this.name]: this.toJSON(),
    };
  }

  firstNode(): Chainable {
    if (this._prev) {
      return this._prev.firstNode();
    }
    return this;
  }

  serializeToDefinition() {
    return {
      StartAt: this.firstNode().name,
      States: {
        ...this._prev?.serialize(),
        [this.name]: this.toJSON(),
      },
    };
  }

  toJSON() {
    return {
      ...(this._nextName ? { Next: this._nextName } : { End: true }),
      Retry: this._retries,
    };
  }

  public createPermissions(role: aws.iam.Role, prefix: string) {
    this._prev?.createPermissions(role, prefix);
  }
}
