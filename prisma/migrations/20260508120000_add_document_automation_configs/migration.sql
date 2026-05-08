ALTER TABLE "Company"
ADD COLUMN "documentWebhookConfig" JSONB,
ADD COLUMN "documentEmailConfig" JSONB;

ALTER TABLE "Brand"
ADD COLUMN "documentWebhookConfig" JSONB,
ADD COLUMN "documentEmailConfig" JSONB;
