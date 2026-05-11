import { ErrorCode } from './error-codes';
export declare class DomainException extends Error {
    readonly code: ErrorCode;
    readonly details?: Record<string, unknown> | undefined;
    constructor(code: ErrorCode, message: string, details?: Record<string, unknown> | undefined);
}
//# sourceMappingURL=domain-exception.d.ts.map