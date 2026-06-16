CREATE TABLE "SubscriptionInvoice" (
  "id" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "subscriptionId" TEXT,
  "invoiceNumber" TEXT NOT NULL,
  "plan" "OrgPlan" NOT NULL,
  "billingInterval" TEXT NOT NULL DEFAULT 'monthly',
  "status" TEXT NOT NULL DEFAULT 'draft',
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "netMinor" INTEGER NOT NULL,
  "vatMinor" INTEGER NOT NULL,
  "totalMinor" INTEGER NOT NULL,
  "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 0.19,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "paidAt" TIMESTAMP(3),
  "provider" TEXT,
  "providerPaymentId" TEXT,
  "checkoutUrl" TEXT,
  "lineItems" JSONB NOT NULL,
  "sellerSnapshot" JSONB NOT NULL,
  "buyerSnapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SubscriptionInvoice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SubscriptionInvoice_invoiceNumber_key" ON "SubscriptionInvoice"("invoiceNumber");
CREATE UNIQUE INDEX "SubscriptionInvoice_providerPaymentId_key" ON "SubscriptionInvoice"("providerPaymentId");
CREATE INDEX "SubscriptionInvoice_organisationId_status_idx" ON "SubscriptionInvoice"("organisationId", "status");
CREATE INDEX "SubscriptionInvoice_subscriptionId_idx" ON "SubscriptionInvoice"("subscriptionId");

ALTER TABLE "SubscriptionInvoice" ADD CONSTRAINT "SubscriptionInvoice_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SubscriptionInvoice" ADD CONSTRAINT "SubscriptionInvoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "OrganisationSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
