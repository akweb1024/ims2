-- Add customizable invoice entity code and year format for company and brand numbering
ALTER TABLE "Company"
  ADD COLUMN "invoiceEntityCode" TEXT,
  ADD COLUMN "invoiceYearFormat" TEXT DEFAULT 'CALENDAR';

ALTER TABLE "Brand"
  ADD COLUMN "invoiceEntityCode" TEXT,
  ADD COLUMN "invoiceYearFormat" TEXT DEFAULT 'CALENDAR';
