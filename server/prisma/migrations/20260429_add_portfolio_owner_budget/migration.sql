-- Add owner and budget fields to portfolios
ALTER TABLE "portfolios" ADD COLUMN IF NOT EXISTS "owner" TEXT;
ALTER TABLE "portfolios" ADD COLUMN IF NOT EXISTS "budget" NUMERIC(15, 2);

-- Create a default portfolio for any programs that have no portfolio assigned
INSERT INTO "portfolios" ("id", "name", "description", "is_active", "created_at", "updated_at")
SELECT gen_random_uuid(), 'General Portfolio', 'Default portfolio for existing programs', true, NOW(), NOW()
WHERE EXISTS (SELECT 1 FROM "programs" WHERE "portfolio_id" IS NULL);

-- Assign orphaned programs to the default portfolio
UPDATE "programs"
SET "portfolio_id" = (SELECT "id" FROM "portfolios" WHERE "name" = 'General Portfolio' LIMIT 1)
WHERE "portfolio_id" IS NULL;

-- Make portfolio_id NOT NULL on programs
ALTER TABLE "programs" ALTER COLUMN "portfolio_id" SET NOT NULL;
