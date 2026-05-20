ALTER TABLE "Company"
ADD COLUMN IF NOT EXISTS "allowCrossCompanyCustomerInvoices" BOOLEAN NOT NULL DEFAULT false;
