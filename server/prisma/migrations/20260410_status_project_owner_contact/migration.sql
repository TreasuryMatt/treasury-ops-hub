-- AlterTable: replace owner FK with plain text fields
ALTER TABLE "status_projects"
  DROP CONSTRAINT IF EXISTS "status_projects_owner_id_fkey",
  DROP COLUMN IF EXISTS "owner_id",
  ADD COLUMN "federal_product_owner" TEXT,
  ADD COLUMN "customer_contact" TEXT;
