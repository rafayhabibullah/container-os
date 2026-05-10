export interface CredentialResult { externalRef: string; maskedValue: string; }

export interface AccessVendorAdapter {
  issueCredential(params: { agreementId: string; credentialType: 'pin' | 'card' | 'app'; siteId: string; unitId: string }): Promise<CredentialResult>;
  revokeCredential(externalRef: string): Promise<void>;
  restoreCredential(externalRef: string): Promise<void>;
  healthCheck(): Promise<boolean>;
}

export const ACCESS_VENDOR_ADAPTER = Symbol('AccessVendorAdapter');
