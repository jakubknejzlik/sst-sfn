export interface Chainable {
  name: string;
  _prev?: Chainable;
  next: (state: Chainable) => Chainable;
  toJSON: () => object;
  serialize: () => object;
  createPermissions: (role: aws.iam.Role) => void;
  firstNode: () => Chainable;
  serializeToDefinition: () => object;
}

export interface StateBaseParams {
  ResultPath?: string;
  OutputPath?: string;
  Comment?: string;
  InputPath?: string;
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
    };
  }

  public createPermissions(role: aws.iam.Role) {
    this._prev?.createPermissions(role);
  }
}
