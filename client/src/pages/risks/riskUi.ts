import { RiskActionStatus, RiskCriticality, RiskProgress } from '../../types';

export const RISK_PROGRESS_LABELS: Record<RiskProgress, string> = {
  open: 'Open',
  accepted: 'Accepted',
  escalated_to_issue: 'Escalated to Issue',
  mitigated: 'Mitigated',
};

export const RISK_PROGRESS_STYLES: Record<RiskProgress, { bg: string; color: string }> = {
  open: { bg: 'var(--usa-primary)', color: '#fff' },
  accepted: { bg: 'var(--usa-base-light)', color: 'var(--usa-base-darkest)' },
  escalated_to_issue: { bg: 'var(--usa-error)', color: '#fff' },
  mitigated: { bg: 'var(--usa-success)', color: '#fff' },
};

export const RISK_CRITICALITY_LABELS: Record<RiskCriticality, string> = {
  critical: 'Critical',
  high: 'High',
  moderate: 'Moderate',
  low: 'Low',
};

export const RISK_CRITICALITY_STYLES: Record<RiskCriticality, { bg: string; color: string }> = {
  critical: { bg: '#1b1b1b', color: '#fff' },
  high: { bg: '#b84c00', color: '#fff' },
  moderate: { bg: 'var(--usa-warning)', color: 'var(--usa-base-darkest)' },
  low: { bg: 'var(--usa-success)', color: '#fff' },
};

export const RISK_ACTION_STATUS_LABELS: Record<RiskActionStatus, string> = {
  red: 'Red',
  yellow: 'Yellow',
  green: 'Green',
};

export const RISK_ACTION_STATUS_STYLES: Record<RiskActionStatus, { bg: string; color: string }> = {
  red: { bg: 'var(--usa-error)', color: '#fff' },
  yellow: { bg: 'var(--usa-warning)', color: 'var(--usa-base-darkest)' },
  green: { bg: 'var(--usa-success)', color: '#fff' },
};
