ALTER TABLE "OrganisationMember" ADD COLUMN IF NOT EXISTS "siteIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "AccessCredential" ADD COLUMN IF NOT EXISTS "encryptedValue" TEXT;
ALTER TABLE "AccessCredential" ADD COLUMN IF NOT EXISTS "keyVersion" TEXT;

ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "sensitivity" TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "retentionUntil" TIMESTAMP(3);
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "locked" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "OrganisationPaymentAccount" (
  "id" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'mollie',
  "status" TEXT NOT NULL DEFAULT 'not_connected',
  "providerAccountId" TEXT,
  "onboardingUrl" TEXT,
  "onboardingStartedAt" TIMESTAMP(3),
  "onboardingCompletedAt" TIMESTAMP(3),
  "capabilities" JSONB,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganisationPaymentAccount_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "OrganisationPaymentAccount_organisationId_provider_key" ON "OrganisationPaymentAccount"("organisationId", "provider");
CREATE INDEX IF NOT EXISTS "OrganisationPaymentAccount_status_idx" ON "OrganisationPaymentAccount"("status");
ALTER TABLE "OrganisationPaymentAccount" ADD CONSTRAINT "OrganisationPaymentAccount_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "AccountingValidationRun" (
  "id" TEXT NOT NULL,
  "organisationId" TEXT,
  "siteId" TEXT,
  "kind" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'passed',
  "issues" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccountingValidationRun_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AccountingValidationRun_organisationId_createdAt_idx" ON "AccountingValidationRun"("organisationId", "createdAt");
CREATE INDEX IF NOT EXISTS "AccountingValidationRun_siteId_createdAt_idx" ON "AccountingValidationRun"("siteId", "createdAt");

CREATE TABLE IF NOT EXISTS "IdempotencyRecord" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "responseStatus" INTEGER,
  "responseBody" JSONB,
  "status" TEXT NOT NULL DEFAULT 'started',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "IdempotencyRecord_key_method_path_key" ON "IdempotencyRecord"("key", "method", "path");
CREATE INDEX IF NOT EXISTS "IdempotencyRecord_expiresAt_idx" ON "IdempotencyRecord"("expiresAt");
