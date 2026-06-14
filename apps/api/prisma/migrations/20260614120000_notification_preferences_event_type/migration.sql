-- AlterTable
ALTER TABLE "NotificationPreference" ADD COLUMN     "eventType" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_eventType_channel_key" ON "NotificationPreference"("userId", "eventType", "channel");
