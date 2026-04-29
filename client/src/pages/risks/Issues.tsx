import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { issuesApi } from '../../api/issues';
import { programsApi } from '../../api/programs';
import { statusProjectsApi } from '../../api/statusProjects';
import { Icon } from '../../components/Icon';
import { IssuesDashboardStats, Program, Risk, RiskCriticality, StatusProject } from '../../types';
import { RISK_CRITICALITY_LABELS, RISK_CRITICALITY_STYLES } from './riskUi';

function Pill({ children, bg, color }: { children: React.ReactNode; bg: string; color: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 999, backgroundColor: bg, color, fontSize: 12, fontWeight: 700 }}>
      {children}
    </span>
  );
}

type SortColumn = 'riskCode' | 'title' | 'program' | 'project' | 'criticality' | 'escalatedAt' | 'impactDate';

function SortTh({ col, label, sort, onSort }: { col: SortColumn; label: string; sort: { col: SortColumn; dir: 'asc' | 'desc' }; onSort: (col: SortColumn) => void }) {
  const active = sort.col === col;
  return (
    <th onClick={() => onSort(col)} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {label}
        <Icon
          name={active ? (sort.dir === 'asc' ? 'arrow_up' : 'arrow_down') : 'arrow_updown'}
          size={14}
          color={active ? '#fff' : 'rgba(255,255,255,0.5)'}
        />
      </span>
    </th>
  );
}

export function Issues() {
  const navigate = useNavigate();
  const [sort, setSort] = useState<{ col: SortColumn; dir: 'asc' | 'desc' }>({ col: 'escalatedAt', dir: 'desc' });
  const [filters, setFilters] = useState({ search: '', programId: '', projectId: '', criticality: '' });

  const queryParams = useMemo(
    () => ({
      ...(filters.search ? { search: filters.search } : {}),
      ...(filters.programId ? { programId: filters.programId } : {}),
      ...(filters.projectId ? { projectId: filters.projectId } : {}),
      ...(filters.criticality ? { criticality: filters.criticality } : {}),
      sortBy: sort.col,
      sortDir: sort.dir,
    }),
    [filters, sort]
  );

  const { data: issues = [], isLoading } = useQuery<Risk[]>({
    queryKey: ['issues', queryParams],
    queryFn: () => issuesApi.list(queryParams),
  });

  const { data: stats } = useQuery<IssuesDashboardStats>({
    queryKey: ['issues-dashboard'],
    queryFn: issuesApi.dashboard,
  });

  const { data: programs = [] } = useQuery<Program[]>({
    queryKey: ['programs'],
    queryFn: programsApi.list,
  });

  const { data: projects = [] } = useQuery<StatusProject[]>({
    queryKey: ['status-projects', 'all-issues'],
    queryFn: () => statusProjectsApi.list({}),
  });

  const visibleProjects = filters.programId
    ? projects.filter((p) => p.programId === filters.programId)
    : projects;

  function handleSort(col: SortColumn) {
    setSort((prev) => (prev.col === col ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' }));
  }

  // Group issues by program for the "by program" section
  const issuesByProgram = useMemo(() => {
    const map = new Map<string, { programName: string; issues: Risk[] }>();
    for (const issue of issues) {
      const programId = issue.programId;
      const programName = issue.program?.name || 'Unknown Program';
      if (!map.has(programId)) map.set(programId, { programName, issues: [] });
      map.get(programId)!.issues.push(issue);
    }
    return Array.from(map.entries()).sort((a, b) => a[1].programName.localeCompare(b[1].programName));
  }, [issues]);

  const hasFilters = !!(filters.search || filters.programId || filters.projectId || filters.criticality);

  if (isLoading) {
    return <div className="page-loading"><span className="usa-spinner" aria-label="Loading" /> Loading...</div>;
  }

  return (
    <div className="usa-page">
      <div className="usa-page-header">
        <div>
          <h1 className="usa-page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="report" color="#c9a227" size={26} />
            Issues
          </h1>
          <p className="usa-page-subtitle">{issues.length} active issue{issues.length !== 1 ? 's' : ''} escalated from risks</p>
        </div>
      </div>

      {/* ── Dashboard cards ── */}
      {stats && (
        <>
          {/* Top row: total + criticality breakdown */}
          <div className="dashboard-quick-stats" style={{ marginBottom: 'var(--space-3)' }}>
            <button className="dashboard-quick-stat" onClick={() => setFilters((f) => ({ ...f, criticality: '' }))}>
              <div className="dashboard-quick-stat__label">Total Issues</div>
              <div className="dashboard-quick-stat__value">{stats.totalIssues}</div>
            </button>
            {(['critical', 'high', 'moderate', 'low'] as const).map((c) => (
              <button
                key={c}
                className={`dashboard-quick-stat${(c === 'critical' || c === 'high') && stats.byCriticality[c] > 0 ? ' dashboard-quick-stat--danger' : ''}`}
                style={{ borderLeftColor: RISK_CRITICALITY_STYLES[c].bg }}
                onClick={() => setFilters((f) => ({ ...f, criticality: c }))}
              >
                <div className="dashboard-quick-stat__label">{RISK_CRITICALITY_LABELS[c]}</div>
                <div className="dashboard-quick-stat__value">{stats.byCriticality[c]}</div>
              </button>
            ))}
          </div>

          {/* By program cards */}
          {stats.byProgram.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              {stats.byProgram.map((prog) => (
                <div
                  key={prog.id}
                  className="detail-card"
                  style={{ cursor: 'pointer', transition: 'box-shadow 0.15s', borderLeft: '3px solid var(--usa-error)' }}
                  onClick={() => setFilters((f) => ({ ...f, programId: prog.id, projectId: '' }))}
                  onMouseEnter={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow-2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow-1)')}
                >
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--usa-primary-darker)', marginBottom: 4 }}>
                    {prog.name}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--usa-error-dark)' }}>
                    <strong>{prog.count}</strong> issue{prog.count !== 1 ? 's' : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Filter bar ── */}
      <div className="filter-bar">
        <div className="filter-bar__search">
          <Icon name="search" color="var(--usa-base)" />
          <input
            className="usa-input"
            placeholder="Search by ID, title, statement, or SPM ID"
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
          />
        </div>
        <select
          className="usa-select"
          value={filters.programId}
          onChange={(e) => setFilters((prev) => ({ ...prev, programId: e.target.value, projectId: '' }))}
        >
          <option value="">All Programs</option>
          {programs.map((program) => (
            <option key={program.id} value={program.id}>{program.name}</option>
          ))}
        </select>
        <select
          className="usa-select"
          value={filters.projectId}
          onChange={(e) => setFilters((prev) => ({ ...prev, projectId: e.target.value }))}
        >
          <option value="">All Projects</option>
          {visibleProjects.map((project) => (
            <option key={project.id} value={project.id}>{project.name}</option>
          ))}
        </select>
        <select
          className="usa-select"
          value={filters.criticality}
          onChange={(e) => setFilters((prev) => ({ ...prev, criticality: e.target.value }))}
        >
          <option value="">All Criticality</option>
          {(Object.keys(RISK_CRITICALITY_LABELS) as RiskCriticality[]).map((c) => (
            <option key={c} value={c}>{RISK_CRITICALITY_LABELS[c]}</option>
          ))}
        </select>
        {hasFilters && (
          <button
            className="usa-button usa-button--unstyled"
            style={{ fontSize: 13, color: 'var(--usa-base-dark)', whiteSpace: 'nowrap' }}
            onClick={() => setFilters({ search: '', programId: '', projectId: '', criticality: '' })}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ── Issues table ── */}
      {issues.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon"><Icon name="check_circle" size={48} /></div>
          <h3>No issues found</h3>
          <p>
            {hasFilters
              ? 'No issues match the current filters.'
              : 'No risks have been escalated to issues yet. Issues appear automatically when a risk\'s impact date passes or its progress is set to "Escalated to Issue".'}
          </p>
        </div>
      ) : hasFilters ? (
        /* Flat table when filtering */
        <div className="table-wrap">
          <IssueTable issues={issues} onNavigate={(id) => navigate(`/risks/issues/${id}`)} sort={sort} onSort={handleSort} />
        </div>
      ) : (
        /* Grouped by program when no filters */
        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          {issuesByProgram.map(([programId, { programName, issues: programIssues }]) => (
            <div key={programId}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Icon name="folder" size={16} color="var(--usa-primary)" />
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--usa-primary-darker)' }}>{programName}</h3>
                <span style={{ fontSize: 12, color: 'var(--usa-base-dark)', marginLeft: 4 }}>
                  {programIssues.length} issue{programIssues.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="table-wrap">
                <IssueTable issues={programIssues} onNavigate={(id) => navigate(`/risks/issues/${id}`)} sort={sort} onSort={handleSort} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Shared table component ───────────────────────────────────────────────────

function IssueTable({
  issues,
  onNavigate,
  sort,
  onSort,
}: {
  issues: Risk[];
  onNavigate: (id: string) => void;
  sort: { col: SortColumn; dir: 'asc' | 'desc' };
  onSort: (col: SortColumn) => void;
}) {
  return (
    <table className="usa-table">
      <thead>
        <tr>
          <SortTh col="riskCode" label="ID" sort={sort} onSort={onSort} />
          <SortTh col="title" label="Title" sort={sort} onSort={onSort} />
          <SortTh col="program" label="Program" sort={sort} onSort={onSort} />
          <SortTh col="project" label="Project" sort={sort} onSort={onSort} />
          <SortTh col="criticality" label="Criticality" sort={sort} onSort={onSort} />
          <SortTh col="escalatedAt" label="Escalated" sort={sort} onSort={onSort} />
          <SortTh col="impactDate" label="Impact Date" sort={sort} onSort={onSort} />
        </tr>
      </thead>
      <tbody>
        {issues.map((issue) => (
          <tr key={issue.id} onClick={() => onNavigate(issue.id)} style={{ cursor: 'pointer' }}>
            <td style={{ fontWeight: 700 }}>{issue.riskCode}</td>
            <td>
              <div style={{ fontWeight: 600 }}>{issue.title}</div>
              {issue.spmId && <div style={{ fontSize: 12, color: 'var(--usa-base-dark)' }}>SPM: {issue.spmId}</div>}
            </td>
            <td>{issue.program?.name || '—'}</td>
            <td>{issue.statusProject?.name || '—'}</td>
            <td>
              <Pill {...RISK_CRITICALITY_STYLES[issue.criticality]}>
                {RISK_CRITICALITY_LABELS[issue.criticality]}
              </Pill>
            </td>
            <td>{issue.escalatedAt ? new Date(issue.escalatedAt).toLocaleDateString() : '—'}</td>
            <td>{issue.impactDate ? new Date(issue.impactDate).toLocaleDateString() : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
