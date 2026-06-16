ALTER TABLE "Invoice"
  ADD COLUMN "invoiceNumber" TEXT,
  ADD COLUMN "issuedAt" TIMESTAMP(3),
  ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'de',
  ADD COLUMN "netMinor" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "vatMinor" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "pdfStorageKey" TEXT;

CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

ALTER TABLE "Mandate"
  ADD COLUMN "consentEvidence" JSONB,
  ADD COLUMN "provider" TEXT,
  ADD COLUMN "providerRef" TEXT;

ALTER TABLE "AccessCredential"
  ADD COLUMN "releasePolicy" TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN "releasedAt" TIMESTAMP(3),
  ADD COLUMN "releasedToTenant" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "validFrom" TIMESTAMP(3),
  ADD COLUMN "validUntil" TIMESTAMP(3);

ALTER TABLE "Task"
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN "completedAt" TIMESTAMP(3);

ALTER TABLE "InspectionRun" ADD COLUMN "reportDocumentId" TEXT;

ALTER TABLE "Incident"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'operator',
  ADD COLUMN "rootCause" TEXT,
  ADD COLUMN "photoIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "TaskComment" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "actorId" TEXT,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskComment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TaskComment_taskId_createdAt_idx" ON "TaskComment"("taskId", "createdAt");
ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "OrganisationSubscription" (
  "id" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "plan" "OrgPlan" NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'trial',
  "billingInterval" TEXT NOT NULL DEFAULT 'monthly',
  "basePriceMinor" INTEGER NOT NULL,
  "includedSites" INTEGER NOT NULL,
  "includedUnits" INTEGER NOT NULL,
  "extraUnitPriceMinor" INTEGER NOT NULL DEFAULT 0,
  "marketplaceRateBp" INTEGER NOT NULL DEFAULT 0,
  "provider" TEXT,
  "providerCustomerId" TEXT,
  "providerSubscriptionId" TEXT,
  "trialEndsAt" TIMESTAMP(3),
  "currentPeriodStart" TIMESTAMP(3) NOT NULL,
  "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganisationSubscription_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OrganisationSubscription_organisationId_status_idx" ON "OrganisationSubscription"("organisationId", "status");
ALTER TABLE "OrganisationSubscription" ADD CONSTRAINT "OrganisationSubscription_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "CommissionRecord" (
  "id" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "reservationId" TEXT,
  "agreementId" TEXT,
  "invoiceId" TEXT,
  "source" TEXT NOT NULL,
  "eligible" BOOLEAN NOT NULL DEFAULT false,
  "rateBp" INTEGER NOT NULL DEFAULT 0,
  "baseMinor" INTEGER NOT NULL DEFAULT 0,
  "amountMinor" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "status" TEXT NOT NULL DEFAULT 'not_applicable',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommissionRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CommissionRecord_organisationId_status_idx" ON "CommissionRecord"("organisationId", "status");
CREATE INDEX "CommissionRecord_reservationId_idx" ON "CommissionRecord"("reservationId");

CREATE TABLE "InvoiceSequence" (
  "id" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "nextNumber" INTEGER NOT NULL DEFAULT 1,
  "prefix" TEXT NOT NULL DEFAULT 'RE',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InvoiceSequence_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "InvoiceSequence_organisationId_year_key" ON "InvoiceSequence"("organisationId", "year");

CREATE TABLE "BackgroundJob" (
  "id" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BackgroundJob_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "BackgroundJob_status_runAt_idx" ON "BackgroundJob"("status", "runAt");

CREATE TABLE "PlatformFeatureFlag" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "scope" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlatformFeatureFlag_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PlatformFeatureFlag_key_key" ON "PlatformFeatureFlag"("key");

CREATE TABLE "PlatformSupportAccess" (
  "id" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformSupportAccess_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PlatformSupportAccess_organisationId_createdAt_idx" ON "PlatformSupportAccess"("organisationId", "createdAt");
