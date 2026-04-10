-- AlterTable
ALTER TABLE "status_projects" ADD COLUMN "staffing_project_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "status_projects_staffing_project_id_key" ON "status_projects"("staffing_project_id");

-- AddForeignKey
ALTER TABLE "status_projects" ADD CONSTRAINT "status_projects_staffing_project_id_fkey" FOREIGN KEY ("staffing_project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: link status projects to staffing projects by matching name (case-insensitive)
UPDATE "status_projects" sp
SET "staffing_project_id" = p.id
FROM "projects" p
WHERE LOWER(sp.name) = LOWER(p.name)
  AND p.is_active = true
  AND sp.staffing_project_id IS NULL;
