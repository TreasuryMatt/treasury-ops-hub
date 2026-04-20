import React from 'react';
import { StatusProjectStatusType } from '../types';

const RAG_CONFIG: Record<StatusProjectStatusType, { bg: string; label: string }> = {
  initiated: { bg: 'var(--usa-base-light)', label: 'Initiated' },
  green: { bg: 'var(--usa-success)', label: 'On Track' },
  yellow: { bg: 'var(--usa-warning)', label: 'At Risk' },
  red: { bg: 'var(--usa-error)', label: 'Off Track' },
  gray: { bg: 'var(--usa-base)', label: 'Not Started' },
};

interface RagBadgeProps {
  status: StatusProjectStatusType;
  size?: 'small' | 'large';
}

export function RagBadge({ status, size = 'small' }: RagBadgeProps) {
  const config = RAG_CONFIG[status] || RAG_CONFIG.gray;
  const isLarge = size === 'large';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isLarge ? 8 : 5,
        padding: isLarge ? '6px 14px' : '2px 10px',
        borderRadius: 12,
        fontSize: isLarge ? 14 : 12,
        fontWeight: 600,
        color: status === 'yellow' ? '#1b1b1b' : '#fff',
        backgroundColor: config.bg,
        lineHeight: isLarge ? '20px' : '16px',
        whiteSpace: 'nowrap',
      }}
    >
      {config.label}
    </span>
  );
}
