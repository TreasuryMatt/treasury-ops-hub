import React from 'react';
import { ProjectPhase } from '../types';

interface GanttChartProps {
  phases: ProjectPhase[];
  onPhaseClick?: (phase: ProjectPhase) => void;
}

function buildTicks(minTime: number, maxTime: number, range: number) {
  const ticks: { label: string; left: number }[] = [];
  const rangeDays = range / (1000 * 60 * 60 * 24);
  const cursor = new Date(minTime);

  if (rangeDays <= 14) {
    // Daily ticks: every day starting the day after minTime
    cursor.setDate(cursor.getDate() + 1);
    while (cursor.getTime() <= maxTime) {
      const left = ((cursor.getTime() - minTime) / range) * 100;
      if (left >= 2 && left <= 98) {
        ticks.push({ label: cursor.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), left });
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  } else if (rangeDays <= 45) {
    // Weekly ticks: start at the first Monday on or after minTime
    const day = cursor.getDay();
    const daysUntilMon = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
    cursor.setDate(cursor.getDate() + daysUntilMon);
    while (cursor.getTime() <= maxTime) {
      const left = ((cursor.getTime() - minTime) / range) * 100;
      if (left >= 2 && left <= 98) {
        ticks.push({ label: cursor.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), left });
      }
      cursor.setDate(cursor.getDate() + 7);
    }
  } else if (rangeDays <= 120) {
    // Biweekly: 1st and 15th of each month
    cursor.setDate(1);
    while (cursor.getTime() <= maxTime) {
      for (const d of [1, 15]) {
        const tick = new Date(cursor.getFullYear(), cursor.getMonth(), d);
        const left = ((tick.getTime() - minTime) / range) * 100;
        if (left >= 2 && left <= 98) {
          ticks.push({ label: tick.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), left });
        }
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }
  } else {
    // Monthly ticks
    cursor.setDate(1);
    cursor.setMonth(cursor.getMonth() + 1);
    while (cursor.getTime() <= maxTime) {
      const left = ((cursor.getTime() - minTime) / range) * 100;
      if (left >= 0 && left <= 100) {
        ticks.push({ label: cursor.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }), left });
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  return ticks;
}

export function GanttChart({ phases, onPhaseClick }: GanttChartProps) {
  if (!phases.length) return null;

  const starts = phases.map((p) => new Date(p.startDate).getTime());
  const ends = phases.map((p) => new Date(p.endDate).getTime());
  const minTime = Math.min(...starts);
  const maxTime = Math.max(...ends);
  const range = maxTime - minTime || 1;

  const formatDate = (d: string) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const ticks = buildTicks(minTime, maxTime, range);

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ minWidth: 500, position: 'relative' }}>
        {/* Tick header */}
        {ticks.length > 0 && (
          <div style={{ display: 'flex', marginBottom: 6, paddingLeft: 152 }}>
            <div style={{ flex: 1, position: 'relative', height: 18 }}>
              {ticks.map((t, i) => (
                <span
                  key={i}
                  style={{
                    position: 'absolute',
                    left: `${t.left}%`,
                    fontSize: 11,
                    color: 'var(--usa-base)',
                    transform: 'translateX(-50%)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Today line */}
        {(() => {
          const todayPct = ((Date.now() - minTime) / range) * 100;
          if (todayPct < 0 || todayPct > 100) return null;
          return (
            <div style={{ display: 'flex', paddingLeft: 152, position: 'relative' }}>
              <div style={{ flex: 1, position: 'relative', height: 0 }}>
                <div
                  style={{
                    position: 'absolute',
                    left: `${todayPct}%`,
                    top: 0,
                    width: 2,
                    height: phases.length * 36 + 4,
                    background: 'var(--usa-error)',
                    opacity: 0.5,
                    zIndex: 1,
                    pointerEvents: 'none',
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    left: `${todayPct}%`,
                    top: -14,
                    transform: 'translateX(-50%)',
                    fontSize: 10,
                    color: 'var(--usa-error)',
                    fontWeight: 700,
                    zIndex: 2,
                  }}
                >
                  Today
                </span>
              </div>
            </div>
          );
        })()}

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
