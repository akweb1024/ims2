DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'CommissionPayoutStatus'
          AND n.nspname = 'public'
    ) THEN
        CREATE TYPE "public"."CommissionPayoutStatus" AS ENUM (
            'REQUESTED',
            'APPROVED',
            'REJECTED',
            'PAID',
            'CANCELLED'
        );
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "public"."CommissionPayout" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "agencyProfileId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "reviewedByUserId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "public"."CommissionPayoutStatus" NOT NULL DEFAULT 'REQUESTED',
    "method" TEXT DEFAULT 'Bank Transfer',
    "notes" TEXT,
    "paymentReference" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionPayout_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CommissionPayout_agencyProfileId_idx"
    ON "public"."CommissionPayout"("agencyProfileId");

CREATE INDEX IF NOT EXISTS "CommissionPayout_companyId_idx"
    ON "public"."CommissionPayout"("companyId");

CREATE INDEX IF NOT EXISTS "CommissionPayout_status_idx"
    ON "public"."CommissionPayout"("status");

CREATE INDEX IF NOT EXISTS "CommissionPayout_requestedByUserId_idx"
    ON "public"."CommissionPayout"("requestedByUserId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'CommissionPayout_agencyProfileId_fkey'
    ) THEN
        ALTER TABLE "public"."CommissionPayout"
            ADD CONSTRAINT "CommissionPayout_agencyProfileId_fkey"
            FOREIGN KEY ("agencyProfileId") REFERENCES "public"."CustomerProfile"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'CommissionPayout_companyId_fkey'
    ) THEN
        ALTER TABLE "public"."CommissionPayout"
            ADD CONSTRAINT "CommissionPayout_companyId_fkey"
            FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'CommissionPayout_requestedByUserId_fkey'
    ) THEN
        ALTER TABLE "public"."CommissionPayout"
            ADD CONSTRAINT "CommissionPayout_requestedByUserId_fkey"
            FOREIGN KEY ("requestedByUserId") REFERENCES "public"."User"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'CommissionPayout_reviewedByUserId_fkey'
    ) THEN
        ALTER TABLE "public"."CommissionPayout"
            ADD CONSTRAINT "CommissionPayout_reviewedByUserId_fkey"
            FOREIGN KEY ("reviewedByUserId") REFERENCES "public"."User"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
