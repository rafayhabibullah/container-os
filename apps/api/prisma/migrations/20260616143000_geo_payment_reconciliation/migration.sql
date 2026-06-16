ALTER TABLE "Site" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "Site" ADD COLUMN "longitude" DOUBLE PRECISION;
ALTER TABLE "PaymentAttempt" ADD COLUMN "lastCheckedAt" TIMESTAMP(3);

CREATE INDEX "Site_latitude_longitude_idx" ON "Site"("latitude", "longitude");
