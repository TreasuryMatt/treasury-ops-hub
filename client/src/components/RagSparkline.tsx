import React, { useState } from 'react';
import { StatusTrendPoint, StatusProjectStatusType } from '../types';

const STATUS_COLORS: Record<StatusProjectStatusType, string> = {
  green: 'var(--usa-success)',
  yellow: 'var(--usa-warning)',
  red: 'var(--usa-error)',
  gray: 'var(--usa-base)',
};

const STATUS_LABELS: Record<StatusProjectStatusType, string> = {
  green: 'On Track',
  yellow: 'At Risk',
  red: 'Off Track',
  gray: 'Not Started',
};

interface RagSparklineProps {
  points: StatusTrendPoint[];
}

export function RagSparkline({ points }: RagSparklineProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (!points || points.length === 0) {
    return <span style={{ color: 'var(--usa-base)', fontSize: 12 }}>—</span>;
  }

  if (points.length === 1) {
    const p = points[0];
    return (
      <svg width={20} height={20} style={{ verticalAlign: 'middle' }}>
        <title>{`${STATUS_LABELS[p.status]} — ${new Date(p.date).toLocaleDateString()}`}</title>
        <circle cx={10} cy={10} r={5} fill={STATUS_COLORS[p.status]} />
      </svg>
    );
  }

  const width = 120;
  const height = 20;
  const padX = 6;
  const padY = 4;
  const innerW = width - padX * 2;
  const r = 4;

  return (
    <svg width={width} height={height} style={{ verticalAlign: 'middle' }}>
      {points.map((p, i) => {
        const x = padX + (i / (points.length - 1)) * innerW;
        const cy = height / 2;
        const color = STATUS_COLORS[p.status];
        const isHovered = hovered === i;

        return (
          <g key={i}>
            {/* Connecting line to next point */}
            {i < points.length - 1 && (
              <line
                x1={x}
                y1={cy}
                x2={padX + ((i + 1) / (points.length - 1)) * innerW}
                y2={cy}
                stroke="var(--usa-base-lighter)"
                strokeWidth={1.5}
              />
            )}
            {/* Data point */}
            <circle
              cx={x}
              cy={cy}
              r={isHovered ? r + 1.5 : r}
              fill={color}
              stroke={isHovered ? '#1b1b1b' : 'none'}
              strokeWidth={isHovered ? 1.5 : 0}
              style={{ cursor: 'pointer', transition: 'r 0.1s' }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
            <title>{`${STATUS_LABELS[p.status]} — ${new Date(p.date).toLocaleDateString()}`}</title>
          </g>
        );
      })}
    </svg>
  );
}
