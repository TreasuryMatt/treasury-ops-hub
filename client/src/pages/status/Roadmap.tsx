import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { statusAdminApi } from '../../api/statusAdmin';
import { programsApi } from '../../api/programs';
import { Program, StatusProject, ProjectPhase, StatusProjectStatusType, Application } from '../../types';
import { Icon } from '../../components/Icon';
import { RagBadge } from '../../components/RagBadge';

type WindowOption = 'all' | 'this-month' | 'next-3' | 'next-6' | 'this-year' | 'custom';

const WINDOW_LABELS: Record<WindowOption, string> = {
  all: 'All Time',
  'this-month': 'This Month',
  'next-3': 'Next 3 Months',
  'next-6': 'Next 6 Months',
  'this-year': 'This Year',
  custom: 'Custom',
};

function getPresetRange(option: WindowOption): { start: Date; end: Date } | null {
  const now = new Date();
  switch (option) {
    case 'this-month':
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      };
    case 'next-3':
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 3, 0),
      };
    case 'next-6':
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 6, 0),
      };
    case 'this-year':
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: new Date(now.getFullYear(), 11, 31),
      };
    default:
      return null;
  }
}

const STATUS_COLORS: Record<StatusProjectStatusType, string> = {
  initiated: 'var(--usa-info)',
  green: 'var(--usa-success)',
  yellow: 'var(--usa-warning)',
  red: 'var(--usa-error)',
  gray: 'var(--usa-base)',
};

interface RoadmapProject extends Omit<StatusProject, 'program' | 'phases' | 'application'> {
  phases: ProjectPhase[];
  program: { id: string; name: string };
  application: Application | null;
}

export function Roadmap() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [filterProgramId, setFilterProgramId] = useState(searchParams.get('programId') || '');
  const [filterApplicationId, setFilterApplicationId] = useState('');
  const [windowOption, setWindowOption] = useState<WindowOption>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [collapsedPrograms, setCollapsedPrograms] = useState<Set<string>>(new Set());
  const startRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLInputElement>(null);

  function applyCustomRange() {
    setCustomStart(startRef.current?.value ?? '');
    setCustomEnd(endRef.current?.value ?? '');
  }

  function toggleProgram(name: string) {
    setCollapsedPrograms((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  const { data: projects = [], isLoading } = useQuery<RoadmapProject[]>({
    queryKey: ['roadmap'],
    queryFn: statusAdminApi.roadmap,
  });

  const { data: programs = [] } = useQuery<Program[]>({
    queryKey: ['programs'],
    queryFn: programsApi.list,
  });

  const allApplications = Array.from(
    new Map(
      projects
        .map((project) => project.application)
        .filter((application): application is Application => application != null)
        .map((application) => [application.id, application])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  const filtered = projects.filter((p) => {
    if (filterProgramId && p.programId !== filterProgramId) return false;
    if (filterApplicationId && p.application?.id !== filterApplicationId) return false;
    return true;
  });

  // Only include projects that have phases
  const withPhases = filtered.filter((p) => p.phases.length > 0);
  const withoutPhases = filtered.filter((p) => p.phases.length === 0);

  // Compute global time range across all projects with phases
  const allDates = withPhases.flatMap((p) =>
    p.phases.flatMap((ph) => [new Date(ph.startDate).getTime(), new Date(ph.endDate).getTime()])
  );
  const autoMin = allDates.length ? Math.min(...allDates) : Date.now();
  const autoMax = allDates.length ? Math.max(...allDates) : Date.now() + 1;

  const presetRange = windowOption !== 'all' && windowOption !== 'custom' ? getPresetRange(windowOption) : null;
  const hasCustomRange = windowOption === 'custom' && !!customStart && !!customEnd;
  const hasActiveRange = !!presetRange || hasCustomRange;

  const minTime = presetRange
    ? presetRange.start.getTime()
    : hasCustomRange
      ? new Date(customStart).getTime()
      : autoMin;
  const maxTime = presetRange
    ? presetRange.end.getTime()
    : hasCustomRange
      ? new Date(customEnd).getTime()
      : autoMax;
  const range = maxTime - minTime || 1;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  const pctLeft = (d: string) => ((new Date(d).getTime() - minTime) / range) * 100;
  const pctWidth = (start: string, end: string) =>
    ((new Date(end).getTime() - new Date(start).getTime()) / range) * 100;

  // Adaptive tick marks — weekly for short ranges, biweekly for medium, monthly/quarterly for long
  const tickMonths: { label: string; left: number }[] = [];
  if (allDates.length || hasActiveRange) {
    const rangeDays = range / (1000 * 60 * 60 * 24);
    const cursor = new Date(minTime);

    if (rangeDays <= 14) {
      // Daily ticks: every day starting the day after minTime
      cursor.setDate(cursor.getDate() + 1);
      while (cursor.getTime() <= maxTime) {
        const left = ((cursor.getTime() - minTime) / range) * 100;
        if (left >= 2 && left <= 98) {
          tickMonths.push({
            label: cursor.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            left,
          });
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
          tickMonths.push({
            label: cursor.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            left,
          });
        }
        cursor.setDate(cursor.getDate() + 7);
      }
    } else if (rangeDays <= 120) {
      // Biweekly ticks: 1st and 15th of each month
      cursor.setDate(1);
      while (cursor.getTime() <= maxTime) {
        for (const d of [1, 15]) {
          const tick = new Date(cursor.getFullYear(), cursor.getMonth(), d);
          const left = ((tick.getTime() - minTime) / range) * 100;
          if (left >= 2 && left <= 98) {
            tickMonths.push({
              label: tick.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
              left,
            });
          }
        }
        cursor.setMonth(cursor.getMonth() + 1);
      }
    } else if (rangeDays <= 365) {
      // Monthly ticks
      cursor.setDate(1);
      cursor.setMonth(cursor.getMonth() + 1);
      while (cursor.getTime() <= maxTime) {
        const left = ((cursor.getTime() - minTime) / range) * 100;
        if (left >= 0 && left <= 100) {
          tickMonths.push({
            label: cursor.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
            left,
          });
        }
        cursor.setMonth(cursor.getMonth() + 1);
      }
    } else {
      // Quarterly ticks for long ranges (> 1 year)
      cursor.setDate(1);
      const qStart = Math.ceil((cursor.getMonth() + 1) / 3) * 3;
      cursor.setMonth(qStart);
      while (cursor.getTime() <= maxTime) {
        const left = ((cursor.getTime() - minTime) / range) * 100;
        if (left >= 0 && left <= 100) {
          tickMonths.push({
            label: cursor.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
            left,
          });
        }
        cursor.setMonth(cursor.getMonth() + 3);
      }
    }
  }

  // Pre-compute grouped map for today-line height and rendering
  const grouped = new Map<string, RoadmapProject[]>();
  for (const p of withPhases) {
    const key = p.program.name;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(p);
  }

  if (isLoading) {
    return <div className="page-loading"><span className="usa-spinner" aria-label="Loading" /> Loading...</div>;
  }

  return (
    <div className="usa-page">
      <div className="usa-page-header">
        <div>
          <h1 className="usa-page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="timeline" color="var(--usa-primary)" size={26} />
            Portfolio Roadmap
          </h1>
          <p className="usa-page-subtitle">
            {withPhases.length} project{withPhases.length !== 1 ? 's' : ''} with phases
          </p>
        </div>
      </div>

      <div className="filter-bar" style={{ marginBottom: 'var(--space-3)' }}>
        <select
          className="usa-select"
          value={windowOption}
          onChange={(e) => setWindowOption(e.target.value as WindowOption)}
        >
          {(Object.entries(WINDOW_LABELS) as [WindowOption, string][]).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>

        {windowOption === 'custom' && (
          <>
            <input ref={startRef} type="date" className="usa-input" style={{ width: 160 }} />
            <span style={{ alignSelf: 'center', color: 'var(--usa-base-dark)', fontSize: 13 }}>to</span>
            <input ref={endRef} type="date" className="usa-input" style={{ width: 160 }} />
            <button className="usa-button" style={{ background: 'var(--usa-success)', color: '#fff' }} onClick={applyCustomRange}>
              Apply
            </button>
          </>
        )}

        <select
          className="usa-select"
          value={filterProgramId}
          onChange={(e) => setFilterProgramId(e.target.value)}
          style={{ maxWidth: 260 }}
        >
          <option value="">All Programs</option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          className="usa-select"
          value={filterApplicationId}
          onChange={(e) => setFilterApplicationId(e.target.value)}
          style={{ maxWidth: 260 }}
        >
          <option value="">All Applications</option>
          {allApplications.map((application) => (
            <option key={application.id} value={application.id}>{application.name}</option>
          ))}
        </select>
      </div>

      {withPhases.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon"><Icon name="timeline" size={48} /></div>
          <h3>No roadmap data</h3>
          <p>Add phases to status projects to see them on the roadmap.</p>
        </div>
      ) : (
        <div className="detail-card" style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 800 }}>
            {/* Month header */}
            <div style={{ display: 'flex', marginBottom: 8, paddingLeft: 220 }}>
              <div style={{ flex: 1, position: 'relative', height: 20 }}>
                {tickMonths.map((t, i) => (
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

            {/* Today line marker */}
            {(() => {
              const todayPct = ((Date.now() - minTime) / range) * 100;
              if (todayPct < 0 || todayPct > 100) return null;
              const totalHeight = withPhases.reduce((sum, p) => sum + 28 + p.phases.length * 32, 0) + grouped.size * 50;
              return (
                <div style={{ display: 'flex', paddingLeft: 220, position: 'relative' }}>
                  <div style={{ flex: 1, position: 'relative', height: 0 }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: `${todayPct}%`,
                        top: 0,
                        width: 2,
                        height: totalHeight,
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
                        top: -16,
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

            {/* Rows grouped by program — accordion per program */}
            {Array.from(grouped.entries()).map(([progName, progProjects]) => {
              const isCollapsed = collapsedPrograms.has(progName);
              return (
                <div key={progName} className="rollup-program">
                  {/* Program accordion header */}
                  <button
                    className="rollup-program__header"
                    style={{ width: '100%', borderRadius: isCollapsed ? 4 : '4px 4px 0 0', marginBottom: isCollapsed ? 0 : 4 }}
                    onClick={() => toggleProgram(progName)}
                  >
                    <Icon name={isCollapsed ? 'chevron_right' : 'expand_more'} color="#fff" size={18} />
                    <span className="rollup-program__name">{progName}</span>
                    <span className="rollup-program__meta">{progProjects.length} project{progProjects.length !== 1 ? 's' : ''}</span>
                  </button>

                  {!isCollapsed && progProjects.map((proj) => {
                    // Filter to phases visible in the current range
                    const visiblePhases = proj.phases.filter((ph) => {
                      const rawLeft = pctLeft(ph.startDate);
                      const rawRight = pctLeft(ph.endDate);
                      return rawRight >= 0 && rawLeft <= 100;
                    });
                    if (visiblePhases.length === 0) return null;

                    return (
                      <div key={proj.id} style={{ marginBottom: 6 }}>
                        {/* Project name — primary, status dot subordinate */}
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginBottom: 2 }}
                          onClick={() => navigate(`/status/projects/${proj.id}`)}
                          title={proj.name}
                        >
                          <div style={{ width: 210, flexShrink: 0, paddingRight: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden' }}>
                              <span style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                {proj.name}
                              </span>
                              <span
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  background: STATUS_COLORS[proj.status],
                                  flexShrink: 0,
                                  border: '1px solid rgba(0,0,0,0.12)',
                                }}
                                title={proj.status}
                              />
                            </div>
                            {proj.application && (
                              <span className="app-pill" style={{ fontSize: 10, padding: '0 4px', marginTop: 2, display: 'inline-block' }}>
                                {proj.application.name}
                              </span>
                            )}
                          </div>
                          {/* Faint rule across the bar area */}
                          <div style={{ flex: 1, height: 1, background: 'var(--usa-base-lighter)' }} />
                        </div>

                        {/* One row per phase */}
                        {visiblePhases.map((ph) => {
                          const rawLeft = pctLeft(ph.startDate);
                          const rawRight = pctLeft(ph.endDate);
                          const clippedLeft = Math.max(0, rawLeft);
                          const clippedRight = Math.min(100, rawRight);
                          const clippedWidth = clippedRight - clippedLeft;
                          const fadeLeft = hasActiveRange && rawLeft < 0;
                          const fadeRight = hasActiveRange && rawRight > 100;
                          const barColor = ph.color || STATUS_COLORS[proj.status] || 'var(--usa-primary)';
                          let background: string = barColor;
                          if (fadeLeft && fadeRight) {
                            background = `linear-gradient(to right, transparent, ${barColor} 15%, ${barColor} 85%, transparent)`;
                          } else if (fadeLeft) {
                            background = `linear-gradient(to right, transparent, ${barColor} 20%)`;
                          } else if (fadeRight) {
                            background = `linear-gradient(to left, transparent, ${barColor} 20%)`;
                          }

                          return (
                            <div key={ph.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 4, height: 28 }}>
                              {/* Phase name label — indented */}
                              <div style={{ width: 210, flexShrink: 0, paddingLeft: 18, paddingRight: 12, fontSize: 11, color: 'var(--usa-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {ph.name}
                              </div>
                              {/* Bar track */}
                              <div style={{ flex: 1, position: 'relative', height: 24, background: 'var(--usa-base-lightest)', borderRadius: 4, overflow: 'hidden' }}>
                                <div
                                  style={{
                                    position: 'absolute',
                                    left: `${clippedLeft}%`,
                                    width: `${Math.max(0.5, clippedWidth)}%`,
                                    height: '100%',
                                    background,
                                    borderRadius: 3,
                                    display: 'flex',
                                    alignItems: 'center',
                                    overflow: 'hidden',
                                  }}
                                  title={`${ph.name}: ${formatDate(ph.startDate)} – ${formatDate(ph.endDate)}`}
                                >
                                  <span style={{ fontSize: 10, color: '#fff', fontWeight: 500, padding: '0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {formatDate(ph.startDate)} – {formatDate(ph.endDate)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {withoutPhases.length > 0 && (
        <div style={{ marginTop: 'var(--space-3)' }}>
          <div className="section-header">
            <h2 className="section-title">Projects without phases ({withoutPhases.length})</h2>
          </div>
          <div className="table-wrap">
            <table className="usa-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Project</th>
                  <th>Program</th>
                  <th>Application</th>
                </tr>
              </thead>
              <tbody>
                {withoutPhases.map((p) => (
                  <tr key={p.id} onClick={() => navigate(`/status/projects/${p.id}`)} style={{ cursor: 'pointer' }}>
                    <td><RagBadge status={p.status} /></td>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td>{p.program?.name}</td>
                    <td>{p.application?.name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
