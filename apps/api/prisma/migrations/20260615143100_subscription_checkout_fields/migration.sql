ALTER TABLE "Organisation" ALTER COLUMN "plan" SET DEFAULT 'free';

ALTER TABLE "OrganisationSubscription"
  ADD COLUMN "providerPaymentId" TEXT,
  ADD COLUMN "checkoutUrl" TEXT,
  ADD COLUMN "lastPaymentStatus" TEXT;

CREATE UNIQUE INDEX "OrganisationSubscription_providerPaymentId_key"
  ON "OrganisationSubscription"("providerPaymentId");
