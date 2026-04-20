CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "applications_program_id_name_key" ON "applications"("program_id", "name");

ALTER TABLE "status_projects"
ADD COLUMN "application_id" TEXT;

ALTER TABLE "applications"
ADD CONSTRAINT "applications_program_id_fkey"
FOREIGN KEY ("program_id") REFERENCES "programs"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "status_projects"
ADD CONSTRAINT "status_projects_application_id_fkey"
FOREIGN KEY ("application_id") REFERENCES "applications"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "applications" ("id", "program_id", "name", "description", "updated_at")
SELECT
  gen_random_uuid()::text,
  derived."program_id",
  derived."name",
  derived."description",
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT
    sp."program_id",
    p."name",
    p."description"
  FROM "status_project_products" spp
  JOIN "status_projects" sp ON sp."id" = spp."status_project_id"
  JOIN "products" p ON p."id" = spp."product_id"
) AS derived;

WITH ranked_project_apps AS (
  SELECT
    spp."status_project_id",
    a."id" AS "application_id",
    ROW_NUMBER() OVER (
      PARTITION BY spp."status_project_id"
      ORDER BY p."name" ASC, a."id" ASC
    ) AS row_num
  FROM "status_project_products" spp
  JOIN "status_projects" sp ON sp."id" = spp."status_project_id"
  JOIN "products" p ON p."id" = spp."product_id"
  JOIN "applications" a
    ON a."program_id" = sp."program_id"
   AND a."name" = p."name"
)
UPDATE "status_projects" sp
SET "application_id" = ranked_project_apps."application_id"
FROM ranked_project_apps
WHERE sp."id" = ranked_project_apps."status_project_id"
  AND ranked_project_apps.row_num = 1;
