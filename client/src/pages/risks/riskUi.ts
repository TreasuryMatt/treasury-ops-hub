import { RiskActionStatus, RiskCriticality, RiskProgress, RiskStatus } from '../../types';

export const RISK_PROGRESS_LABELS: Record<RiskProgress, string> = {
  open: 'Open',
  accepted: 'Accepted',
  escalated_to_issue: 'Converted to Issue',
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
  red: 'Off Track',
  yellow: 'At Risk',
  green: 'On Track',
};

export const RISK_ACTION_STATUS_STYLES: Record<RiskActionStatus, { bg: string; color: string }> = {
  red: { bg: 'var(--usa-error)', color: '#fff' },
  yellow: { bg: 'var(--usa-warning)', color: 'var(--usa-base-darkest)' },
  green: { bg: 'var(--usa-success)', color: '#fff' },
};

const RISK_STATUS_SEVERITY: Record<RiskActionStatus, number> = { red: 2, yellow: 1, green: 0 };

export function computeRiskStatus(actions: { status: RiskActionStatus }[]): RiskStatus {
  if (!actions || actions.length === 0) return 'none';
  const worst = actions.reduce((w, a) => (RISK_STATUS_SEVERITY[a.status] > RISK_STATUS_SEVERITY[w.status] ? a : w));
  if (worst.status === 'red') return 'off_track';
  if (worst.status === 'yellow') return 'at_risk';
  return 'on_track';
}

export const RISK_STATUS_LABELS: Record<RiskStatus, string> = {
  off_track: 'Off Track',
  at_risk: 'At Risk',
  on_track: 'On Track',
  none: 'None',
};

export const RISK_STATUS_STYLES: Record<RiskStatus, { bg: string; color: string }> = {
  off_track: { bg: 'var(--usa-error)', color: '#fff' },
  at_risk: { bg: 'var(--usa-warning)', color: 'var(--usa-base-darkest)' },
  on_track: { bg: 'var(--usa-success)', color: '#fff' },
  none: { bg: 'var(--usa-base-light)', color: 'var(--usa-base-darkest)' },
};
