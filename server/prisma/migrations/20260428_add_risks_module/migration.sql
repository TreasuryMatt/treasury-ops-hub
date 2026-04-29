CREATE TYPE "RiskProgress" AS ENUM ('open', 'accepted', 'escalated_to_issue');
CREATE TYPE "RiskCriticality" AS ENUM ('critical', 'high', 'moderate', 'low');
CREATE TYPE "RiskActionStatus" AS ENUM ('red', 'yellow', 'green');

CREATE TABLE "risk_categories" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "risk_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "risks" (
  "id" TEXT NOT NULL,
  "risk_code" TEXT NOT NULL,
  "progress" "RiskProgress" NOT NULL DEFAULT 'open',
  "program_id" TEXT NOT NULL,
  "status_project_id" TEXT NOT NULL,
  "category_id" TEXT NOT NULL,
  "spm_id" TEXT,
  "title" TEXT NOT NULL,
  "statement" TEXT NOT NULL,
  "criticality" "RiskCriticality" NOT NULL,
  "submitter_id" TEXT NOT NULL,
  "date_identified" TIMESTAMP(3),
  "probability" DOUBLE PRECISION,
  "impact" TEXT,
  "impact_date" TIMESTAMP(3),
  "closure_criteria" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "risks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "risk_comments" (
  "id" TEXT NOT NULL,
  "risk_id" TEXT NOT NULL,
  "author_id" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "risk_comments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "risk_mitigation_actions" (
  "id" TEXT NOT NULL,
  "risk_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "due_date" TIMESTAMP(3),
  "status" "RiskActionStatus" NOT NULL DEFAULT 'yellow',
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "risk_mitigation_actions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "risk_categories_name_key" ON "risk_categories"("name");
CREATE UNIQUE INDEX "risks_risk_code_key" ON "risks"("risk_code");

ALTER TABLE "risks"
  ADD CONSTRAINT "risks_program_id_fkey"
  FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "risks"
  ADD CONSTRAINT "risks_status_project_id_fkey"
  FOREIGN KEY ("status_project_id") REFERENCES "status_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "risks"
  ADD CONSTRAINT "risks_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "risk_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "risks"
  ADD CONSTRAINT "risks_submitter_id_fkey"
  FOREIGN KEY ("submitter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "risk_comments"
  ADD CONSTRAINT "risk_comments_risk_id_fkey"
  FOREIGN KEY ("risk_id") REFERENCES "risks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "risk_comments"
  ADD CONSTRAINT "risk_comments_author_id_fkey"
  FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "risk_mitigation_actions"
  ADD CONSTRAINT "risk_mitigation_actions_risk_id_fkey"
  FOREIGN KEY ("risk_id") REFERENCES "risks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
