export class UnexpectedInternalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnexpectedInternalError";
  }
}
