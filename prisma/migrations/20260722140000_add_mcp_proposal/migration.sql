-- CreateTable
CREATE TABLE "McpProposal" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "instruction" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "preview" TEXT NOT NULL,
    "proposedBy" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3),
    "result" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "McpProposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "McpProposal_status_idx" ON "McpProposal"("status");

-- CreateIndex
CREATE INDEX "McpProposal_createdAt_idx" ON "McpProposal"("createdAt");
