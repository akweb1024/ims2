-- Per-template page setup (top margin, footer text, page numbers) for letters.
ALTER TABLE "DocumentTemplate" ADD COLUMN "settings" JSONB;
