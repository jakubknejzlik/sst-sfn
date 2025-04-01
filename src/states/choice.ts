import { Chainable, Retriable, StateBase } from "../state";

export class Choice extends StateBase implements Retriable {
  private choices: Array<{
    Condition: any; // Use the concrete condition type here
    Next: Chainable;
  }> = [];
  private defaultNext?: Chainable;

  constructor(public name: string) {
    super(name);
  }

  when<T extends `{%${string}%}`>(condition: T, next: Chainable) {
    if (!condition.startsWith("{%") || !condition.endsWith("%}")) {
      throw new Error("Condition must start with '{%' and end with '%}'.");
    }
    this.choices.push({ Condition: condition, Next: next });
    return this;
  }

  otherwise(next: Chainable) {
    this.defaultNext = next;
    return this;
  }

  public next(_: Chainable): Chainable {
    throw new Error("Cannot call next on Choice state");
  }

  serialize() {
    let obj = super.serialize();
    for (const c of this.choices) {
      obj = { ...obj, ...c.Next.serialize() };
    }
    if (this.defaultNext) {
      obj = { ...obj, ...this.defaultNext.serialize() };
    }
    return obj;
  }

  toJSON() {
    const vals = super.toJSON();
    delete vals["End"];
    const res = {
      ...vals,
      Choices: this.choices.map((c) => ({
        ...c,
        Next: c.Next.name,
      })),
      Type: "Choice",
      QueryLanguage: "JSONata",
      Default: this.defaultNext?.name,
    };
    return res;
  }
}
