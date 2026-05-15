-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('move_in', 'move_out', 'inspect_unit', 'clean_unit', 'repair_unit', 'verify_document', 'approve_booking', 'call_tenant', 'collect_payment', 'assign_access', 'upload_contract', 'other');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('low', 'normal', 'high', 'urgent');

-- AlterEnum
ALTER TYPE "TaskStatus" ADD VALUE 'blocked';

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "bookingId" TEXT,
ADD COLUMN     "organisationId" TEXT,
ADD COLUMN     "priority" "TaskPriority" NOT NULL DEFAULT 'normal',
ADD COLUMN     "tenantId" TEXT,
ADD COLUMN     "type" "TaskType",
ADD COLUMN     "unitId" TEXT;

UPDATE "Task" t
SET "organisationId" = s."organisationId"
FROM "Site" s
WHERE s.id = t."siteId"
  AND t."organisationId" IS NULL;
