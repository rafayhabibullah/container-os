import { DomainException } from '@sitelager/domain-types';
import { ErrorCodes } from '@sitelager/domain-types';

// SEPA mandate reference: 1-35 chars, allowed character set per EPC standard:
// letters, digits and the special chars / ? : ( ) . , ' + -
// no leading, trailing or consecutive special chars.
const SEPA_ALLOWED_CHARS = /^[A-Za-z0-9/?:().,'+-]+$/;
const SEPA_SPECIAL_CHARS = /[/?:().,'+-]/;

export function validateMandateReference(reference: string): void {
  if (!reference || reference.length < 1 || reference.length > 35) {
    throw new DomainException(
      ErrorCodes.MANDATE_REFERENCE_INVALID,
      'Mandate reference must be between 1 and 35 characters',
      { reference },
    );
  }

  if (!SEPA_ALLOWED_CHARS.test(reference)) {
    throw new DomainException(
      ErrorCodes.MANDATE_REFERENCE_INVALID,
      'Mandate reference contains characters outside the SEPA allowed character set',
      { reference },
    );
  }

  const first = reference[0];
  const last = reference[reference.length - 1];
  if (SEPA_SPECIAL_CHARS.test(first) || SEPA_SPECIAL_CHARS.test(last)) {
    throw new DomainException(
      ErrorCodes.MANDATE_REFERENCE_INVALID,
      'Mandate reference must not start or end with a special character',
      { reference },
    );
  }

  for (let i = 0; i < reference.length - 1; i++) {
    if (SEPA_SPECIAL_CHARS.test(reference[i]) && SEPA_SPECIAL_CHARS.test(reference[i + 1])) {
      throw new DomainException(
        ErrorCodes.MANDATE_REFERENCE_INVALID,
        'Mandate reference must not contain consecutive special characters',
        { reference },
      );
    }
  }
}

/**
 * Generates a SEPA-compliant mandate reference of the form
 * `SL-<orgIdPrefix>-<timestamp>`.
 */
export function generateMandateReference(orgIdOrCustomerId: string): string {
  const prefix = orgIdOrCustomerId.replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase() || 'SL';
  const ref = `SL-${prefix}-${Date.now()}`;
  return ref.slice(0, 35);
}

export function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
