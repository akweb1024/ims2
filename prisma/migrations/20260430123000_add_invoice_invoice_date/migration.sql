-- Allow overriding invoice issue date (separate from createdAt)
ALTER TABLE "Invoice" ADD COLUMN "invoiceDate" TIMESTAMP(3);

