import { Injectable } from '@nestjs/common';
import { AccessVendorAdapter, CredentialResult } from './access-vendor.adapter';

@Injectable()
export class StubAccessAdapter implements AccessVendorAdapter {
  private credentials = new Map<string, { revoked: boolean }>();

  async issueCredential(params: { agreementId: string; credentialType: string; siteId: string; unitId: string }): Promise<CredentialResult> {
    const pin = String(Math.floor(1000 + Math.random() * 9000));
    const externalRef = `stub_${params.agreementId}_${Date.now()}`;
    this.credentials.set(externalRef, { revoked: false });
    return { externalRef, maskedValue: `****${pin.slice(-2)}` };
  }

  async revokeCredential(externalRef: string): Promise<void> { this.credentials.set(externalRef, { revoked: true }); }
  async restoreCredential(externalRef: string): Promise<void> { this.credentials.set(externalRef, { revoked: false }); }
  async healthCheck(): Promise<boolean> { return true; }
}
