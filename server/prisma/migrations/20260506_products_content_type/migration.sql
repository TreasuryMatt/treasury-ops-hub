-- ─── Products content type migration ─────────────────────────────────────────
-- Promotes Applications to a first-class "Products" content type.
-- Replaces the old products/status_project_products tables (lookup-only),
-- renames applications → products, adds rich metadata fields, and converts
-- the Program and StatusProject associations to proper join tables.

-- Step 1: Null out staffing projects' product_id references (old product IDs will not survive the rename)
UPDATE "projects" SET "product_id" = NULL WHERE "product_id" IS NOT NULL;
ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "projects_product_id_fkey";

-- Step 2: Drop old lookup tables (data was migrated to applications in 20260416)
DROP TABLE IF EXISTS "status_project_products";
DROP TABLE IF EXISTS "products";

-- Step 2: Create enum types
CREATE TYPE "product_type"         AS ENUM ('PLATFORM', 'APPLICATION', 'INTEGRATION', 'SERVICE', 'MOBILE_APP');
CREATE TYPE "product_status_enum"  AS ENUM ('ACTIVE', 'EVALUATING', 'PLANNED', 'DEPRECATED', 'SUNSET');
CREATE TYPE "product_criticality"  AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'MISSION_CRITICAL');
CREATE TYPE "hosting_model"        AS ENUM ('SAAS', 'ON_PREM', 'HYBRID', 'GOVT_CLOUD', 'INTERNAL_HOSTED');
CREATE TYPE "ato_status"           AS ENUM ('AUTHORIZED', 'PENDING', 'EXPIRED', 'NOT_REQUIRED');
CREATE TYPE "fedramp_level"        AS ENUM ('LOW', 'MODERATE', 'HIGH', 'NOT_APPLICABLE');
CREATE TYPE "data_classification"  AS ENUM ('PUBLIC', 'SENSITIVE', 'RESTRICTED');

-- Step 3: Rename applications → products
ALTER TABLE "applications" RENAME TO "products";

-- Step 4: Drop old unique index (was unique per program; now name is globally unique)
DROP INDEX IF EXISTS "applications_program_id_name_key";

-- Step 5: Add all new metadata columns
ALTER TABLE "products"
  ADD COLUMN "product_type"        "product_type"        NOT NULL DEFAULT 'APPLICATION',
  ADD COLUMN "vendor"              TEXT,
  ADD COLUMN "is_internal"         BOOLEAN               NOT NULL DEFAULT false,
  ADD COLUMN "product_status"      "product_status_enum" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "criticality"         "product_criticality" NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN "hosting_model"       "hosting_model",
  ADD COLUMN "platform_id"         TEXT,
  ADD COLUMN "product_owner"       TEXT,
  ADD COLUMN "technical_owner"     TEXT,
  ADD COLUMN "primary_url"         TEXT,
  ADD COLUMN "documentation_url"   TEXT,
  ADD COLUMN "logo_url"            TEXT,
  ADD COLUMN "user_count"          INTEGER,
  ADD COLUMN "annual_cost"         NUMERIC(15, 2),
  ADD COLUMN "contract_expiry"     TIMESTAMP(3),
  ADD COLUMN "version"             TEXT,
  ADD COLUMN "ato_status"          "ato_status",
  ADD COLUMN "ato_expiry"          TIMESTAMP(3),
  ADD COLUMN "fedramp_level"       "fedramp_level",
  ADD COLUMN "data_classification" "data_classification";

-- Step 6: Unique name constraint (globally unique, no longer per-program)
ALTER TABLE "products" ADD CONSTRAINT "products_name_key" UNIQUE ("name");

-- Step 7: Self-referential platform FK
ALTER TABLE "products"
  ADD CONSTRAINT "products_platform_id_fkey"
  FOREIGN KEY ("platform_id") REFERENCES "products"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 8: Create product_programs join table (Product ↔ Program, many-to-many)
CREATE TABLE "product_programs" (
  "product_id" TEXT NOT NULL,
  "program_id" TEXT NOT NULL,
  CONSTRAINT "product_programs_pkey"           PRIMARY KEY ("product_id", "program_id"),
  CONSTRAINT "product_programs_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "product_programs_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Step 9: Migrate existing program_id associations into the join table
INSERT INTO "product_programs" ("product_id", "program_id")
SELECT "id", "program_id"
FROM   "products"
WHERE  "program_id" IS NOT NULL;

-- Step 10: Drop program_id FK and column from products
ALTER TABLE "products" DROP CONSTRAINT "applications_program_id_fkey";
ALTER TABLE "products" DROP COLUMN "program_id";

-- Step 11: Create product_status_projects join table (Product ↔ StatusProject, many-to-many)
CREATE TABLE "product_status_projects" (
  "product_id"        TEXT NOT NULL,
  "status_project_id" TEXT NOT NULL,
  CONSTRAINT "product_status_projects_pkey"                 PRIMARY KEY ("product_id", "status_project_id"),
  CONSTRAINT "product_status_projects_product_id_fkey"      FOREIGN KEY ("product_id")        REFERENCES "products"("id")        ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "product_status_projects_status_project_id_fkey" FOREIGN KEY ("status_project_id") REFERENCES "status_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Step 12: Migrate existing application_id (1-to-1) into join table rows
INSERT INTO "product_status_projects" ("product_id", "status_project_id")
SELECT "application_id", "id"
FROM   "status_projects"
WHERE  "application_id" IS NOT NULL;

-- Step 13: Drop application_id from status_projects
ALTER TABLE "status_projects" DROP CONSTRAINT "status_projects_application_id_fkey";
ALTER TABLE "status_projects" DROP COLUMN "application_id";
