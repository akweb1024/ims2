-- Add optional PO number on invoices (shown on print/PDF copies)
ALTER TABLE "Invoice" ADD COLUMN "purchaseOrderNumber" TEXT;

