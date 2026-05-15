-- CreateIndex
CREATE INDEX "Task_siteId_idx" ON "Task"("siteId");

-- CreateIndex
CREATE INDEX "Task_siteId_status_idx" ON "Task"("siteId", "status");

-- CreateIndex
CREATE INDEX "Task_organisationId_idx" ON "Task"("organisationId");
