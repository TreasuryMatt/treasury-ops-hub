import React from 'react';
import { ProjectPhase } from '../types';

interface GanttChartProps {
  phases: ProjectPhase[];
  onPhaseClick?: (phase: ProjectPhase) => void;
}

export function GanttChart({ phases, onPhaseClick }: GanttChartProps) {
  if (!phases.length) return null;

  const starts = phases.map((p) => new Date(p.startDate).getTime());
  const ends = phases.map((p) => new Date(p.endDate).getTime());
  const minTime = Math.min(...starts);
  const maxTime = Math.max(...ends);
  const range = maxTime - minTime || 1;

  const formatDate = (d: string) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ minWidth: 500, position: 'relative' }}>
        {phases.map((phase) => {
          const startPct = ((new Date(phase.startDate).getTime() - minTime) / range) * 100;
          const widthPct = ((new Date(phase.endDate).getTime() - new Date(phase.startDate).getTime()) / range) * 100;

          return (
            <div
              key={phase.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: 8,
                cursor: onPhaseClick ? 'pointer' : 'default',
              }}
              onClick={() => onPhaseClick?.(phase)}
            >
              <div style={{ width: 140, flexShrink: 0, fontSize: 13, fontWeight: 500, paddingRight: 12 }}>
                {phase.name}
              </div>
              <div style={{ flex: 1, position: 'relative', height: 28, background: 'var(--usa-base-lightest)', borderRadius: 4 }}>
                <div
                  style={{
                    position: 'absolute',
                    left: `${startPct}%`,
                    width: `${Math.max(widthPct, 1)}%`,
                    height: '100%',
                    backgroundColor: phase.color || 'var(--usa-primary)',
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    transition: 'opacity 0.15s',
                  }}
                  title={`${phase.name}: ${formatDate(phase.startDate)} – ${formatDate(phase.endDate)}`}
                >
                  <span style={{ fontSize: 11, color: '#fff', fontWeight: 500, padding: '0 4px', whiteSpace: 'nowrap' }}>
                    {formatDate(phase.startDate)} – {formatDate(phase.endDate)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
