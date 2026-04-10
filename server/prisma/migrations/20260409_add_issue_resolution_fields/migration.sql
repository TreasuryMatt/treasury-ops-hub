-- AlterTable
ALTER TABLE "issue_entries" ADD COLUMN "resolution_notes" TEXT,
ADD COLUMN "resolved_at" TIMESTAMP(3),
ADD COLUMN "resolved_by_id" TEXT;

-- AddForeignKey
ALTER TABLE "issue_entries" ADD CONSTRAINT "issue_entries_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
