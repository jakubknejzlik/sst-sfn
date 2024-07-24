import { Input } from "@pulumi/pulumi";

export interface Chainable {
  name: string;
  _prev?: Chainable;
  next: (state: Chainable) => Chainable;
  toJSON: () => any;
  serialize: () => any;
  createPermissions: (role: aws.iam.Role) => void;
}

export interface StateBaseParams {
  ResultPath?: string;
}

export class StateBase implements Chainable {
  public _prev?: Chainable;
  public _nextName?: string;

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

  toJSON() {
    return {
      ...(this._nextName ? { Next: this._nextName } : { End: true }),
    };
  }
  public createPermissions(role: aws.iam.Role) {
    // noop
  }
}
