import React from 'react';
import { IntakeDetermination, IntakeStatus } from '../types';

type IntakeBadgeValue = IntakeStatus | IntakeDetermination | 'pending';

const LABELS: Record<IntakeBadgeValue, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under Review',
  backlog: 'Backlog',
  denied: 'Denied',
  approved: 'Approved',
  pending: 'Pending',
};

interface IntakeStatusPillProps {
  status: IntakeBadgeValue;
}

export function IntakeStatusPill({ status }: IntakeStatusPillProps) {
  return (
    <span className={`intake-status-pill intake-status-pill--${status}`}>
      {LABELS[status]}
    </span>
  );
}
