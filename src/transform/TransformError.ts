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

export function isTransformError(error: Error): error is TransformError {
  return (error as TransformError).loc != null;
}
