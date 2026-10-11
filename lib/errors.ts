/**
 * An expected failure whose message is safe to show to the person using the
 * app (bad input, a taken username, an unsupported file).
 */
export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserError";
  }
}
