-- Add risk_owner_id to risks table
ALTER TABLE "risks" ADD COLUMN "risk_owner_id" TEXT;
ALTER TABLE "risks" ADD CONSTRAINT "risks_risk_owner_id_fkey" FOREIGN KEY ("risk_owner_id") REFERENCES "resources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
