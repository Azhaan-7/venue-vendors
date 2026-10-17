// Expected failures inside a transaction must roll back before a response is sent.
export class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}
