import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { statusAdminApi } from '../../api/statusAdmin';
import { programsApi } from '../../api/programs';
import { Program, StatusProject, StatusProjectStatusType, Application, StatusTrendPoint } from '../../types';
import { Icon } from '../../components/Icon';
import { RagBadge } from '../../components/RagBadge';
import { RagSparkline } from '../../components/RagSparkline';

interface ReportProject extends Omit<StatusProject, 'program' | 'owner' | 'priority' | 'department'> {
  program: { id: string; name: string };
  owner: { id: string; displayName: string } | null;
  priority: { id: string; name: string } | null;
  department: { id: string; name: string } | null;
  application: Application | null;
  _count: { updates: number; issues: number };
}

const STATUS_ORDER: Record<StatusProjectStatusType, number> = {
  red: 0, yellow: 1, green: 2, initiated: 3, gray: 4,
};

export function Reports() {
  const navigate = useNavigate();
  const [filterProgramId, setFilterProgramId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterApplicationId, setFilterApplicationId] = useState('');
  const [sort, setSort] = useState<{ col: string; dir: 'asc' | 'desc' }>({ col: 'status', dir: 'asc' });

  const { data: projects = [], isLoading } = useQuery<ReportProject[]>({
    queryKey: ['reports'],
    queryFn: statusAdminApi.reports,
  });

  const { data: programs = [] } = useQuery<Program[]>({
    queryKey: ['programs'],
    queryFn: programsApi.list,
  });
  const { data: trends = {} } = useQuery<Record<string, StatusTrendPoint[]>>({
    queryKey: ['status-trends'],
    queryFn: statusAdminApi.trends,
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
    if (filterStatus && p.status !== filterStatus) return false;
    if (filterApplicationId && p.application?.id !== filterApplicationId) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    switch (sort.col) {
      case 'status':
        cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        break;
      case 'name':
        cmp = a.name.localeCompare(b.name);
        break;
      case 'program':
        cmp = (a.program?.name || '').localeCompare(b.program?.name || '');
        break;
      case 'owner':
        cmp = (a.owner?.displayName || '').localeCompare(b.owner?.displayName || '');
        break;
      case 'updates':
        cmp = a._count.updates - b._count.updates;
        break;
      case 'issues':
        cmp = a._count.issues - b._count.issues;
        break;
      case 'nextUpdateDue': {
        const ta = a.nextUpdateDue ? new Date(a.nextUpdateDue).getTime() : Infinity;
        const tb = b.nextUpdateDue ? new Date(b.nextUpdateDue).getTime() : Infinity;
        cmp = ta - tb;
        break;
      }
    }
    return sort.dir === 'asc' ? cmp : -cmp;
  });

  function handleSort(col: string) {
    setSort((prev) =>
      prev.col === col ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' }
    );
  }

  function SortTh({ col, children }: { col: string; children: React.ReactNode }) {
    const active = sort.col === col;
    return (
      <th
        onClick={() => handleSort(col)}
        style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
      >
        {children}
        {active ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ' ⇅'}
      </th>
    );
  }

  // Summary by status
  const counts = filtered.reduce(
    (acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc; },
    {} as Record<string, number>
  );
  const overdueCount = filtered.filter(
    (p) => p.nextUpdateDue && new Date(p.nextUpdateDue) < new Date()
  ).length;

  if (isLoading) {
    return <div className="page-loading"><span className="usa-spinner" aria-label="Loading" /> Loading...</div>;
  }

  return (
    <div className="usa-page">
      <div className="usa-page-header">
        <div>
          <h1 className="usa-page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="description" color="var(--usa-primary)" size={26} />
            Portfolio Reports
          </h1>
          <p className="usa-page-subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''} total</p>
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', marginBottom: 'var(--space-3)' }}>
        <div className="stat-card" style={{ borderTopColor: 'var(--usa-success)' }}>
          <div className="stat-card__value" style={{ color: 'var(--usa-success-dark)' }}>{counts.green || 0}</div>
          <div className="stat-card__label">On Track</div>
        </div>
        <div className="stat-card" style={{ borderTopColor: 'var(--usa-warning-dark)' }}>
          <div className="stat-card__value" style={{ color: 'var(--usa-warning-darker)' }}>{counts.yellow || 0}</div>
          <div className="stat-card__label">At Risk</div>
        </div>
        <div className="stat-card" style={{ borderTopColor: 'var(--usa-error)' }}>
          <div className="stat-card__value" style={{ color: 'var(--usa-error)' }}>{counts.red || 0}</div>
          <div className="stat-card__label">Off Track</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__value">{counts.gray || 0}</div>
          <div className="stat-card__label">Not Started</div>
        </div>
        <div className={`stat-card${overdueCount > 0 ? ' danger' : ''}`}>
          <div className={`stat-card__value${overdueCount > 0 ? ' danger' : ''}`}>{overdueCount}</div>
          <div className="stat-card__label">Overdue Updates</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar" style={{ marginBottom: 'var(--space-3)' }}>
        <select
          className="usa-select"
          value={filterProgramId}
          onChange={(e) => setFilterProgramId(e.target.value)}
        >
          <option value="">All Programs</option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          className="usa-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="green">On Track</option>
          <option value="yellow">At Risk</option>
          <option value="red">Off Track</option>
          <option value="initiated">Initiated</option>
          <option value="gray">Not Started</option>
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
      </div>

      {sorted.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon"><Icon name="description" size={48} /></div>
          <h3>No projects found</h3>
          <p>No projects match the current filters.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="usa-table">
            <thead>
              <tr>
                <SortTh col="status">Status</SortTh>
                <th>Trend</th>
                <SortTh col="name">Project</SortTh>
                <SortTh col="program">Program</SortTh>
                <th>Department</th>
                <SortTh col="owner">Owner</SortTh>
                <th>Priority</th>
                <th>Funded</th>
                <SortTh col="nextUpdateDue">Next Update</SortTh>
                <SortTh col="updates">Updates</SortTh>
                <SortTh col="issues">Issues</SortTh>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) => {
                const overdue = p.nextUpdateDue && new Date(p.nextUpdateDue) < new Date();
                return (
                  <tr key={p.id} onClick={() => navigate(`/status/projects/${p.id}`)} style={{ cursor: 'pointer' }}>
                    <td><RagBadge status={p.status} /></td>
                    <td><RagSparkline points={trends[p.id] || []} /></td>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td>{p.program?.name || '—'}</td>
                    <td>{p.department?.name || '—'}</td>
                    <td>{p.owner?.displayName || '—'}</td>
                    <td>{p.priority?.name || '—'}</td>
                    <td>{p.funded ? 'Yes' : 'No'}</td>
                    <td style={{ color: overdue ? 'var(--usa-error)' : undefined, fontWeight: overdue ? 700 : undefined }}>
                      {p.nextUpdateDue ? new Date(p.nextUpdateDue).toLocaleDateString() : '—'}
                      {overdue && ' ⚠'}
                    </td>
                    <td style={{ textAlign: 'center' }}>{p._count.updates}</td>
                    <td style={{ textAlign: 'center', color: p._count.issues > 0 ? 'var(--usa-warning-darker)' : undefined }}>
                      {p._count.issues || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
