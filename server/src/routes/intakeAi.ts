import { Router, Response, NextFunction } from 'express';
import { requireAuth, requireIntakeReviewer } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

export const intakeAiRouter = Router();
intakeAiRouter.use(requireAuth);

// ─── 1. Submission Assistant Agent (Customer-facing) ────────────────────────
// Input:  { formData: Record<string, any>, userMessage: string }
// Output: { reply: string, suggestions: Array<{ field: string, suggestion: string }> }
intakeAiRouter.post('/assist', async (_req: AuthenticatedRequest, res: Response) => {
  // STUB — replace with real LLM call when API key is available
  res.json({
    data: {
      reply: 'The AI assistant is not yet configured. Please complete the form to the best of your ability and submit for review.',
      suggestions: [],
    },
  });
});

// ─── 2. Feasibility Scorer (Reviewer-triggered) ────────────────────────────
// Input:  { formData: Record<string, any>, documents: Array<{ filename, mimeType, sizeBytes }> }
// Output: { score: number (0-100), breakdown: Array<{ criterion, score, weight, rationale }> }
intakeAiRouter.post('/score', requireIntakeReviewer, async (_req: AuthenticatedRequest, res: Response) => {
  // STUB — replace with real LLM call when API key is available
  res.json({
    data: {
      score: 0,
      breakdown: [],
      note: 'AI scoring is not yet configured. Scores will be generated automatically once the AI integration is connected.',
    },
  });
});

// ─── 3. Design Review Doc Generator (Reviewer-triggered, post-approval) ────
// Input:  { formData: Record<string, any>, documents: Array<{ filename, content? }> }
// Output: { markdown: string }
intakeAiRouter.post('/design-review', requireIntakeReviewer, async (req: AuthenticatedRequest, res: Response) => {
  const { formData } = req.body as { formData?: Record<string, any> };
  // Pre-fill what we can from form data without AI
  const md = generateDesignReviewStub(formData || {});
  res.json({ data: { markdown: md } });
});

// ─── Template pre-fill (no AI needed for direct field mappings) ─────────────
function generateDesignReviewStub(formData: Record<string, any>): string {
  const title = formData.projectName || formData.title || '[Project Name]';
  const problemStatement = formData.problemStatement || '[TO BE DETERMINED]';
  const businessGoals = formData.businessGoals || '[TO BE DETERMINED]';
  const costSavings = formData.costSavings || '[TO BE DETERMINED]';
  const timeline = formData.desiredTimeline || '[TO BE DETERMINED]';
  const stakeholders = formData.stakeholders || '[TO BE DETERMINED]';
  const requirements = formData.technicalRequirements || '[TO BE DETERMINED]';
  const proposedSolution = formData.proposedSolution || '[TO BE DETERMINED]';
  const priority = formData.priority || '[TO BE DETERMINED]';

  return `# Design Review: ${title}

**Author:** [TO BE ASSIGNED]
**Date:** ${new Date().toISOString().split('T')[0]}
**Status:** Draft
**Target Audience:** CTO / Technical Leadership

---

## Executive Summary

**What:** ${title}

**Why:** ${businessGoals}

**Expected Impact:** ${costSavings}

**Timeline:** ${timeline}

**Key Risks:** [TO BE DETERMINED — requires AI analysis]

---

## Background

### Current State
[TO BE DETERMINED — requires AI analysis of submitted materials]

### Problems
${problemStatement}

### Justification for Change
${costSavings}

---

## Goals

### Success Criteria
${businessGoals}

### Non-Goals
[TO BE DETERMINED]

### Measurable Outcomes
[TO BE DETERMINED]

---

## Solution Overview

### High-Level Approach
${proposedSolution}

### Architecture
[TO BE DETERMINED — requires AI analysis]

### Key Components
[TO BE DETERMINED — requires AI analysis]

---

## Detailed Design

### Component Descriptions
[TO BE DETERMINED — requires AI analysis]

### Technology Choices
[TO BE DETERMINED — requires AI analysis]

### Data Models / APIs
[TO BE DETERMINED — requires AI analysis]

---

## Implementation Plan

### Priority
${priority}

### Timeline & Milestones
${timeline}

### Team Assignments
[TO BE DETERMINED]

### Dependencies
[TO BE DETERMINED]

---

## Resource Requirements

### Stakeholders
${stakeholders}

### Team
[TO BE DETERMINED — "My prediction is that I need X engineers for Y weeks/months"]

---

## Technical Requirements

${requirements}

---

## Testing Strategy

### Unit Testing
[TO BE DETERMINED]

### Integration Testing
[TO BE DETERMINED]

### Performance Testing
[TO BE DETERMINED]

### Security Testing
[TO BE DETERMINED]

---

## Deployment Strategy

### Approach
[TO BE DETERMINED]

### Rollback Procedure
[TO BE DETERMINED]

---

## Operations

### Monitoring
[TO BE DETERMINED]

### Alerting
[TO BE DETERMINED]

### Logging
[TO BE DETERMINED]

---

## Risks

| Category | Risk | Severity | Mitigation | Owner |
|----------|------|----------|------------|-------|
| [TO BE DETERMINED] | | | | |

---

## Alternatives Considered

[TO BE DETERMINED — requires AI analysis]

---

## Critical Gaps

[TO BE DETERMINED]

---

## Open Questions

[TO BE DETERMINED]

---

## Approval

- [ ] Approval required before project execution
- Approvers: [TO BE DETERMINED]
- Next steps post-approval: [TO BE DETERMINED]
`;
}
