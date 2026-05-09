import { ErrorCode } from './error-codes';

export class DomainException extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'DomainException';
  }
}
