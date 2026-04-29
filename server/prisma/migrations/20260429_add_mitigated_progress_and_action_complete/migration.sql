-- Add 'mitigated' value to RiskProgress enum
ALTER TYPE "RiskProgress" ADD VALUE IF NOT EXISTS 'mitigated';

-- Add isComplete column to RiskMitigationAction
ALTER TABLE "risk_mitigation_actions" ADD COLUMN IF NOT EXISTS "is_complete" BOOLEAN NOT NULL DEFAULT false;
