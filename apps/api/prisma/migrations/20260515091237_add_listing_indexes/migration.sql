-- AlterTable
ALTER TABLE "Listing" ALTER COLUMN "requiredDocs" SET DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "Listing_organisationId_status_idx" ON "Listing"("organisationId", "status");

-- CreateIndex
CREATE INDEX "Listing_siteId_status_idx" ON "Listing"("siteId", "status");
