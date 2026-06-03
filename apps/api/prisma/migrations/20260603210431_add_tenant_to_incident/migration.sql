-- AlterTable
ALTER TABLE "Incident" ADD COLUMN     "tenantId" TEXT;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
