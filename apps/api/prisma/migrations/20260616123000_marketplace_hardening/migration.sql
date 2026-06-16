CREATE TABLE "MarketplaceReview" (
  "id" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "siteId" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "title" TEXT,
  "body" TEXT,
  "reviewerName" TEXT,
  "reviewerEmail" TEXT,
  "status" TEXT NOT NULL DEFAULT 'published',
  "source" TEXT NOT NULL DEFAULT 'tenant',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MarketplaceReview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SavedSearch" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "locale" TEXT NOT NULL DEFAULT 'de',
  "city" TEXT,
  "query" TEXT,
  "filters" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "source" TEXT NOT NULL DEFAULT 'marketplace',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MarketplaceEvent" (
  "id" TEXT NOT NULL,
  "listingId" TEXT,
  "organisationId" TEXT,
  "siteId" TEXT,
  "eventType" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'web',
  "sessionId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MarketplaceEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MarketplaceReview_listingId_status_idx" ON "MarketplaceReview"("listingId", "status");
CREATE INDEX "MarketplaceReview_organisationId_status_idx" ON "MarketplaceReview"("organisationId", "status");
CREATE INDEX "MarketplaceReview_siteId_status_idx" ON "MarketplaceReview"("siteId", "status");

CREATE INDEX "SavedSearch_email_status_idx" ON "SavedSearch"("email", "status");
CREATE INDEX "SavedSearch_city_status_idx" ON "SavedSearch"("city", "status");

CREATE INDEX "MarketplaceEvent_listingId_eventType_createdAt_idx" ON "MarketplaceEvent"("listingId", "eventType", "createdAt");
CREATE INDEX "MarketplaceEvent_organisationId_eventType_createdAt_idx" ON "MarketplaceEvent"("organisationId", "eventType", "createdAt");
CREATE INDEX "MarketplaceEvent_siteId_eventType_createdAt_idx" ON "MarketplaceEvent"("siteId", "eventType", "createdAt");

ALTER TABLE "MarketplaceReview" ADD CONSTRAINT "MarketplaceReview_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MarketplaceReview" ADD CONSTRAINT "MarketplaceReview_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MarketplaceReview" ADD CONSTRAINT "MarketplaceReview_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MarketplaceEvent" ADD CONSTRAINT "MarketplaceEvent_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketplaceEvent" ADD CONSTRAINT "MarketplaceEvent_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketplaceEvent" ADD CONSTRAINT "MarketplaceEvent_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;
