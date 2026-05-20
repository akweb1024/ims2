ALTER TABLE "Company"
ADD COLUMN IF NOT EXISTS "allowedInvoiceCustomerCompanyIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "Company"
ADD COLUMN IF NOT EXISTS "defaultInvoiceBrandId" TEXT;
