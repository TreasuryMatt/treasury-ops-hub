import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { statusAdminApi } from '../../api/statusAdmin';
import { programsApi } from '../../api/programs';
import { Program, StatusProject, ProjectPhase, StatusProjectStatusType } from '../../types';
import { Icon } from '../../components/Icon';
import { RagBadge } from '../../components/RagBadge';

const STATUS_COLORS: Record<StatusProjectStatusType, string> = {
  green: 'var(--usa-success)',
  yellow: 'var(--usa-warning)',
  red: 'var(--usa-error)',
  gray: 'var(--usa-base)',
};

interface RoadmapProject extends Omit<StatusProject, 'program' | 'phases'> {
  phases: ProjectPhase[];
  program: { id: string; name: string };
}

export function Roadmap() {
  const navigate = useNavigate();
  const [filterProgramId, setFilterProgramId] = useState('');

  const { data: projects = [], isLoading } = useQuery<RoadmapProject[]>({
    queryKey: ['roadmap'],
    queryFn: statusAdminApi.roadmap,
  });

  const { data: programs = [] } = useQuery<Program[]>({
    queryKey: ['programs'],
    queryFn: programsApi.list,
  });

  const filtered = filterProgramId
    ? projects.filter((p) => p.programId === filterProgramId)
    : projects;

  // Only include projects that have phases
  const withPhases = filtered.filter((p) => p.phases.length > 0);
  const withoutPhases = filtered.filter((p) => p.phases.length === 0);

  // Compute global time range across all projects with phases
  const allDates = withPhases.flatMap((p) =>
    p.phases.flatMap((ph) => [new Date(ph.startDate).getTime(), new Date(ph.endDate).getTime()])
  );
  const minTime = allDates.length ? Math.min(...allDates) : Date.now();
  const maxTime = allDates.length ? Math.max(...allDates) : Date.now() + 1;
  const range = maxTime - minTime || 1;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });

  const pctLeft = (d: string) => ((new Date(d).getTime() - minTime) / range) * 100;
  const pctWidth = (start: string, end: string) =>
    ((new Date(end).getTime() - new Date(start).getTime()) / range) * 100;

  // Month tick marks
  const tickMonths: { label: string; left: number }[] = [];
  if (allDates.length) {
    const cursor = new Date(minTime);
    cursor.setDate(1);
    while (cursor.getTime() <= maxTime) {
      const left = ((cursor.getTime() - minTime) / range) * 100;
      tickMonths.push({
        label: cursor.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
        left,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  if (isLoading) {
    return <div className="page-loading"><span className="usa-spinner" aria-label="Loading" /> Loading...</div>;
  }

  return (
    <div className="usa-page">
      <div className="usa-page-header">
        <div>
          <h1 className="usa-page-title">Portfolio Roadmap</h1>
          <p className="usa-page-subtitle">
            {withPhases.length} project{withPhases.length !== 1 ? 's' : ''} with phases
          </p>
        </div>
      </div>

      <div className="filter-bar" style={{ marginBottom: 'var(--space-3)' }}>
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
              return (
                <div style={{ display: 'flex', paddingLeft: 220, position: 'relative' }}>
                  <div style={{ flex: 1, position: 'relative', height: 0 }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: `${todayPct}%`,
                        top: 0,
                        width: 2,
                        height: withPhases.length * 38 + 4,
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

            {/* Rows grouped by program */}
            {(() => {
              // Group by program
              const grouped = new Map<string, RoadmapProject[]>();
              for (const p of withPhases) {
                const key = p.program.name;
                if (!grouped.has(key)) grouped.set(key, []);
                grouped.get(key)!.push(p);
              }

              return Array.from(grouped.entries()).map(([progName, progProjects]) => (
                <div key={progName} style={{ marginBottom: 'var(--space-2)' }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--usa-base)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: 4,
                    }}
                  >
                    {progName}
                  </div>
                  {progProjects.map((proj) => (
                    <div
                      key={proj.id}
                      style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}
                    >
                      {/* Project label */}
                      <div
                        style={{
                          width: 210,
                          flexShrink: 0,
                          paddingRight: 12,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          cursor: 'pointer',
                        }}
                        onClick={() => navigate(`/status/projects/${proj.id}`)}
                        title={proj.name}
                      >
                        <RagBadge status={proj.status} size="small" />
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {proj.name}
                        </span>
                      </div>

                      {/* Phase bars */}
                      <div style={{ flex: 1, position: 'relative', height: 24, background: 'var(--usa-base-lightest)', borderRadius: 4 }}>
                        {proj.phases.map((ph) => {
                          const left = pctLeft(ph.startDate);
                          const width = pctWidth(ph.startDate, ph.endDate);
                          return (
                            <div
                              key={ph.id}
                              style={{
                                position: 'absolute',
                                left: `${Math.max(0, left)}%`,
                                width: `${Math.max(0.5, width)}%`,
                                height: '100%',
                                backgroundColor: ph.color || STATUS_COLORS[proj.status] || 'var(--usa-primary)',
                                borderRadius: 3,
                                display: 'flex',
                                alignItems: 'center',
                                overflow: 'hidden',
                              }}
                              title={`${ph.name}: ${formatDate(ph.startDate)} – ${formatDate(ph.endDate)}`}
                            >
                              <span style={{ fontSize: 10, color: '#fff', fontWeight: 500, padding: '0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {ph.name}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ));
            })()}
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
                </tr>
              </thead>
              <tbody>
                {withoutPhases.map((p) => (
                  <tr key={p.id} onClick={() => navigate(`/status/projects/${p.id}`)} style={{ cursor: 'pointer' }}>
                    <td><RagBadge status={p.status} /></td>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td>{p.program?.name}</td>
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
