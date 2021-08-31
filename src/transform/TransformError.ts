export type SourcePosition = {
  line: number;
  column: number;
};

export class TransformError extends Error {
  readonly loc?: SourcePosition;
  constructor(message: string, loc?: SourcePosition) {
    super(message);
    this.loc = loc;
  }
}
