-- AlterTable
ALTER TABLE "InspectionRun" ADD COLUMN     "checklist" JSONB,
ADD COLUMN     "contractId" TEXT,
ADD COLUMN     "depositDeduction" DOUBLE PRECISION,
ADD COLUMN     "notes" TEXT;
