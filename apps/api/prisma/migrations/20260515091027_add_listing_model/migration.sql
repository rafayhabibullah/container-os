-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('draft', 'published', 'paused', 'fully_booked', 'archived');

-- CreateEnum
CREATE TYPE "BookingMode" AS ENUM ('approval_required', 'instant_booking', 'request_price');

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "publicPriceMinor" INTEGER,
    "showPrice" BOOLEAN NOT NULL DEFAULT true,
    "depositMinor" INTEGER,
    "availableFrom" TIMESTAMP(3),
    "bookingMode" "BookingMode" NOT NULL DEFAULT 'approval_required',
    "status" "ListingStatus" NOT NULL DEFAULT 'draft',
    "requiredDocs" TEXT[],
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "commissionRateBp" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Listing_unitId_key" ON "Listing"("unitId");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_slug_key" ON "Listing"("slug");

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
