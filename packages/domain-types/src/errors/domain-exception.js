"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DomainException = void 0;
class DomainException extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'DomainException';
    }
}
exports.DomainException = DomainException;
//# sourceMappingURL=domain-exception.js.map