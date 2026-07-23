ALTER TABLE "SubscriptionInvoice"
ADD COLUMN "billingReason" TEXT NOT NULL DEFAULT 'subscription_cycle';

CREATE TABLE "SubscriptionInvoiceSequence" (
  "id" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "nextNumber" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SubscriptionInvoiceSequence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SubscriptionInvoiceSequence_year_key"
ON "SubscriptionInvoiceSequence"("year");

INSERT INTO "SubscriptionInvoiceSequence" ("id", "year", "nextNumber", "updatedAt")
SELECT
  'subscription-invoice-' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT,
  EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  COALESCE(COUNT(*), 0)::INTEGER + 1,
  CURRENT_TIMESTAMP
FROM "SubscriptionInvoice"
WHERE EXTRACT(YEAR FROM "invoiceDate") = EXTRACT(YEAR FROM CURRENT_DATE)
ON CONFLICT ("year") DO NOTHING;
