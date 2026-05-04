import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { statusProjectsApi } from '../../api/statusProjects';
import { statusAdminApi } from '../../api/statusAdmin';
import { programsApi } from '../../api/programs';
import { useAuth } from '../../context/AuthContext';
import { StatusProject, Program, StatusProjectStatusType, StatusTrendPoint } from '../../types';
import { Icon } from '../../components/Icon';
import { RagBadge } from '../../components/RagBadge';
import { RagSparkline } from '../../components/RagSparkline';

// ─── Status metadata ──────────────────────────────────────────────────────────

const STATUS_LABELS: Record<StatusProjectStatusType, string> = {
  green: 'On Track',
  yellow: 'At Risk',
  red: 'Off Track',
  initiated: 'Initiated',
  gray: 'Not Started',
};

const STATUS_ORDER: StatusProjectStatusType[] = ['red', 'yellow', 'green', 'initiated', 'gray'];

type Tone = 'neutral' | 'success' | 'warning' | 'danger';

const STATUS_TONE: Record<StatusProjectStatusType, Tone> = {
  red: 'danger',
  yellow: 'warning',
  green: 'success',
  initiated: 'neutral',
  gray: 'neutral',
};


// ─── Attention list item ──────────────────────────────────────────────────────

function AttentionItem({ project, overdue, onClick }: { project: StatusProject; overdue: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        width: '100%', padding: '10px 0', background: 'none', border: 'none',
        borderBottom: '1px solid var(--usa-base-lighter)', cursor: 'pointer', textAlign: 'left', gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <RagBadge status={project.status} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--usa-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {project.name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--usa-base-dark)', marginTop: 2 }}>
            {project.program?.name || '—'}{project.phase ? ` · ${project.phase.name}` : ''}
          </div>
        </div>
      </div>
      {overdue && (
        <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, color: 'var(--usa-error)', whiteSpace: 'nowrap' }}>
          Update overdue
        </span>
      )}
    </button>
  );
}

// ─── Program bar ─────────────────────────────────────────────────────────────

function ProgramBar({ name, count, max, onClick }: { name: string; count: number; max: number; onClick: () => void }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <button onClick={onClick} style={{ display: 'block', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '5px 0', textAlign: 'left' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
        <span style={{ fontWeight: 600, color: 'var(--usa-ink)' }}>{name}</span>
        <span style={{ color: 'var(--usa-base-dark)' }}>{count} project{count !== 1 ? 's' : ''}</span>
      </div>
      <div style={{ background: 'var(--usa-base-lightest)', borderRadius: 4, height: 10, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--usa-primary)', borderRadius: 4, transition: 'width .3s' }} />
      </div>
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function StatusProjects() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const canEdit = user?.role === 'editor' || user?.role === 'manager' || user?.role === 'admin';
  const now = useMemo(() => new Date(), []);

  const [filters, setFilters] = useState({
    programId: searchParams.get('programId') || '',
    status: searchParams.get('status') || '',
    search: '',
  });
  const [filterApplicationId, setFilterApplicationId] = useState('');

  const { data: projects = [], isLoading } = useQuery<StatusProject[]>({
    queryKey: ['status-projects', filters],
    queryFn: () => statusProjectsApi.list(filters),
  });
  const { data: programs = [] } = useQuery<Program[]>({
    queryKey: ['programs'],
    queryFn: programsApi.list,
  });
  const { data: trends = {} } = useQuery<Record<string, StatusTrendPoint[]>>({
    queryKey: ['status-trends'],
    queryFn: statusAdminApi.trends,
  });

  // ── Derived stats (all projects, ignoring application filter) ──────────────
  const stats = useMemo(() => {
    const byStatus = { green: 0, yellow: 0, red: 0, initiated: 0, gray: 0 } as Record<StatusProjectStatusType, number>;
    let overdueCount = 0;
    const programMap = new Map<string, { name: string; count: number }>();

    for (const p of projects) {
      byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
      if (p.nextUpdateDue && new Date(p.nextUpdateDue) < now) overdueCount++;
      if (p.program) {
        const entry = programMap.get(p.programId);
        if (entry) entry.count++;
        else programMap.set(p.programId, { name: p.program.name, count: 1 });
      }
    }

    const byProgram = Array.from(programMap.entries())
      .map(([id, { name, count }]) => ({ id, name, count }))
      .sort((a, b) => b.count - a.count);

    const attentionProjects = projects
      .filter((p) => p.status === 'red' || (p.nextUpdateDue && new Date(p.nextUpdateDue) < now))
      .sort((a, b) => {
        if (a.status === 'red' && b.status !== 'red') return -1;
        if (b.status === 'red' && a.status !== 'red') return 1;
        return 0;
      })
      .slice(0, 8);

    return { total: projects.length, byStatus, overdueCount, byProgram, attentionProjects };
  }, [projects, now]);

  // ── Visible rows (apply application filter on top of server filters) ────────
  const allApplications = useMemo(() => Array.from(
    new Map(
      projects.map((p) => p.application).filter((a): a is NonNullable<typeof a> => a != null)
        .map((a) => [a.id, a])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name)), [projects]);

  const visibleProjects = filterApplicationId
    ? projects.filter((p) => p.application?.id === filterApplicationId)
    : projects;

  const maxProgramCount = stats.byProgram.length > 0 ? Math.max(...stats.byProgram.map((p) => p.count)) : 1;

  // ── Stat chip click: set status filter (toggle off if already active) ───────
  function setStatusChip(s: string) {
    setFilters((f) => ({ ...f, status: f.status === s ? '' : s }));
  }

  if (isLoading) {
    return <div className="page-loading"><span className="usa-spinner" aria-label="Loading" /> Loading...</div>;
  }

  const showCards = stats.total > 0;

  return (
    <div className="usa-page">
      <div className="usa-page-header">
        <div>
          <h1 className="usa-page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="lightbulb" color="var(--usa-primary)" size={26} />
            Projects
          </h1>
          <p className="usa-page-subtitle">
            {stats.total} project{stats.total !== 1 ? 's' : ''}
            {stats.overdueCount > 0 && (
              <span style={{ marginLeft: 8, color: 'var(--usa-error)', fontWeight: 700 }}>
                · {stats.overdueCount} overdue update{stats.overdueCount !== 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
        {canEdit && (
          <button className="usa-button usa-button--outline usa-button--sm" onClick={() => navigate('/status/projects/new')}>
            + New Project
          </button>
        )}
      </div>

      {/* ── Stat chips ── */}
      {showCards && (
        <div className="mini-stat-row">
          <button className={`mini-stat-card${!filters.status ? ' active' : ''}`} onClick={() => setStatusChip('')}>
            <div className="mini-stat-label">Total</div>
            <div className="mini-stat-value">{stats.total}</div>
          </button>
          {STATUS_ORDER.map((s) => stats.byStatus[s] > 0 && (
            <button
              key={s}
              className={`mini-stat-card mini-stat-card--${STATUS_TONE[s]}${filters.status === s ? ' active' : ''}`}
              onClick={() => setStatusChip(s)}
            >
              <div className="mini-stat-label">{STATUS_LABELS[s]}</div>
              <div className="mini-stat-value">{stats.byStatus[s]}</div>
            </button>
          ))}
          {stats.overdueCount > 0 && (
            <button
              className={`mini-stat-card mini-stat-card--danger${filters.status === 'overdue' ? ' active' : ''}`}
              onClick={() => setStatusChip('overdue')}
            >
              <div className="mini-stat-label">Overdue Updates</div>
              <div className="mini-stat-value">{stats.overdueCount}</div>
            </button>
          )}
        </div>
      )}

      {/* ── Section cards ── */}
      {showCards && (stats.attentionProjects.length > 0 || stats.byProgram.length > 1) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>

          {stats.attentionProjects.length > 0 && (
            <div className="detail-card" style={{ padding: 'var(--space-3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Needs Attention</h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--usa-base-dark)' }}>
                    Off-track or overdue-update projects
                  </p>
                </div>
                <Icon name="warning" size={18} color="var(--usa-error)" />
              </div>
              <div>
                {stats.attentionProjects.map((p) => (
                  <AttentionItem
                    key={p.id}
                    project={p}
                    overdue={!!(p.nextUpdateDue && new Date(p.nextUpdateDue) < now)}
                    onClick={() => navigate(`/status/projects/${p.id}`)}
                  />
                ))}
              </div>
            </div>
          )}

          {stats.byProgram.length > 1 && (
            <div className="detail-card" style={{ padding: 'var(--space-3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>By Program</h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--usa-base-dark)' }}>Projects per program</p>
                </div>
                <Icon name="bar_chart" size={18} color="var(--usa-primary)" />
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                {stats.byProgram.map((p) => (
                  <ProgramBar
                    key={p.id}
                    name={p.name}
                    count={p.count}
                    max={maxProgramCount}
                    onClick={() => setFilters((f) => ({ ...f, programId: f.programId === p.id ? '' : p.id }))}
                  />
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ── Filter bar ── */}
      <div className="filter-bar">
        <div className="filter-bar__search">
          <Icon name="search" color="var(--usa-base)" />
          <input
            className="usa-input"
            placeholder="Search projects..."
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
        </div>
        <select
          className="usa-select"
          value={filters.programId}
          onChange={(e) => setFilters((f) => ({ ...f, programId: e.target.value }))}
        >
          <option value="">All Programs</option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          className="usa-select"
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
        >
          <option value="">All Statuses</option>
          <option value="green">On Track</option>
          <option value="yellow">At Risk</option>
          <option value="red">Off Track</option>
          <option value="initiated">Initiated</option>
          <option value="gray">Not Started</option>
          <option value="overdue">Overdue Updates</option>
        </select>
        <select
          className="usa-select"
          value={filterApplicationId}
          onChange={(e) => setFilterApplicationId(e.target.value)}
        >
          <option value="">All Applications</option>
          {allApplications.map((application) => (
            <option key={application.id} value={application.id}>{application.name}</option>
          ))}
        </select>
        {(filters.search || filters.status || filters.programId || filterApplicationId) && (
          <button
            className="usa-button usa-button--unstyled"
            style={{ fontSize: 13, color: 'var(--usa-base-dark)', whiteSpace: 'nowrap' }}
            onClick={() => { setFilters({ search: '', status: '', programId: '' }); setFilterApplicationId(''); }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ── Table ── */}
      {visibleProjects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon"><Icon name="folder_open" size={48} /></div>
          <h3>No projects found</h3>
          <p>{canEdit ? 'Create a project to get started.' : 'No projects match the current filters.'}</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="usa-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Trend</th>
                <th>Project</th>
                <th>Program</th>
                <th>Phase</th>
                <th>Application</th>
                <th>Federal Product Owner</th>
                <th>Next Update Due</th>
              </tr>
            </thead>
            <tbody>
              {visibleProjects.map((sp) => (
                <tr key={sp.id} onClick={() => navigate(`/status/projects/${sp.id}`)} style={{ cursor: 'pointer' }}>
                  <td><RagBadge status={sp.status} /></td>
                  <td><RagSparkline points={trends[sp.id] || []} /></td>
                  <td style={{ fontWeight: 600 }}>{sp.name}</td>
                  <td>{sp.program?.name || '—'}</td>
                  <td>{sp.phase?.name || '—'}</td>
                  <td>{sp.application?.name || '—'}</td>
                  <td>{sp.federalProductOwner || '—'}</td>
                  <td>
                    {sp.nextUpdateDue ? (
                      <span style={{ color: new Date(sp.nextUpdateDue) < now ? 'var(--usa-error)' : undefined, fontWeight: new Date(sp.nextUpdateDue) < now ? 700 : undefined }}>
                        {new Date(sp.nextUpdateDue).toLocaleDateString()}
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
