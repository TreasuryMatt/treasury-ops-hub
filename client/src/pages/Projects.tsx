import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { projectsApi } from '../api/projects';
import { adminApi } from '../api/admin';
import { useAuth } from '../context/AuthContext';
import { Icon } from '../components/Icon';
import { SortIcon, SortDir } from '../components/SortIcon';
import { ProjectsDashboardStats } from '../types';

const STATUS_LABELS: Record<string, string> = {
  in_progress: 'In Progress',
  on_hold: 'On Hold',
  completed: 'Completed',
};

const PRIORITY_TONE: Record<string, string> = {
  high: 'var(--usa-error)',
  medium: 'var(--usa-warning-dark)',
  low: 'var(--usa-base)',
};

function daysUntil(value: string | null) {
  if (!value) return null;
  const now = new Date();
  const target = new Date(value);
  return Math.ceil((target.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}

// ─── Stat chip ───────────────────────────────────────────────────────────────

function StatChip({
  label,
  value,
  active,
  tone = 'neutral',
  onClick,
}: {
  label: string;
  value: number;
  active?: boolean;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
  onClick: () => void;
}) {
  const toneColor =
    tone === 'danger' ? 'var(--usa-error)' :
    tone === 'warning' ? 'var(--usa-warning-dark)' :
    tone === 'success' ? 'var(--usa-success-dark)' :
    'var(--usa-primary-dark)';

  return (
    <button
      onClick={onClick}
      style={{
        flex: '1 1 0',
        minWidth: 100,
        padding: '14px 16px',
        border: active ? `2px solid ${toneColor}` : '2px solid var(--usa-base-lighter)',
        borderRadius: 8,
        background: active ? 'var(--usa-primary-lighter)' : 'var(--card-bg)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--usa-base-dark)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: active ? toneColor : 'var(--usa-ink)', lineHeight: 1 }}>
        {value}
      </div>
    </button>
  );
}

// ─── Ending soon list item ────────────────────────────────────────────────────

function EndingSoonItem({
  project,
  onClick,
}: {
  project: ProjectsDashboardStats['endingSoonProjects'][number];
  onClick: () => void;
}) {
  const days = daysUntil(project.endDate);
  const tone = days !== null && days <= 7 ? 'var(--usa-error)' : days !== null && days <= 14 ? 'var(--usa-warning-dark)' : 'var(--usa-base-dark)';

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        padding: '10px 0',
        background: 'none',
        border: 'none',
        borderBottom: '1px solid var(--usa-base-lighter)',
        cursor: 'pointer',
        textAlign: 'left',
        gap: 12,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--usa-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {project.name}
        </div>
        <div style={{ fontSize: 12, color: 'var(--usa-base-dark)', marginTop: 2 }}>
          {project.product?.name || 'No application'} · {project.teamSize} {project.teamSize === 1 ? 'person' : 'people'}
          {project.priority && (
            <span style={{ marginLeft: 6, fontWeight: 700, color: PRIORITY_TONE[project.priority] ?? 'var(--usa-base)' }}>
              · {project.priority.charAt(0).toUpperCase() + project.priority.slice(1)} priority
            </span>
          )}
        </div>
      </div>
      <span style={{ flexShrink: 0, fontSize: 13, fontWeight: 700, color: tone }}>
        {days !== null ? `${days}d` : '—'}
      </span>
    </button>
  );
}

// ─── By-application bar ───────────────────────────────────────────────────────

function AppBar({ name, count, max, onClick }: { name: string; count: number; max: number; onClick: () => void }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <button
      onClick={onClick}
      style={{ display: 'block', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0', textAlign: 'left' }}
    >
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

export function Projects() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [productId, setProductId] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);

  function handleSort(field: string) {
    if (sortBy === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
    setPage(1);
  }

  function setStatusFilter(s: string) {
    setStatus((prev) => (prev === s ? '' : s));
    setPage(1);
  }

  const params: Record<string, string> = { page: String(page), limit: '50', sortBy, sortDir };
  if (search) params.search = search;
  if (status) params.status = status;
  if (priority) params.priority = priority;
  if (productId) params.productId = productId;

  const { data, isLoading } = useQuery({
    queryKey: ['projects', params],
    queryFn: () => projectsApi.list(params),
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['projects-stats'],
    queryFn: projectsApi.stats,
  });

  const { data: products } = useQuery({ queryKey: ['products'], queryFn: () => adminApi.products() });

  const maxProductCount = stats ? Math.max(...stats.byProduct.map((p) => p.count), 1) : 1;
  const canEdit = user?.role === 'editor' || user?.role === 'manager' || user?.role === 'admin';
  const hasPriorityData = data?.data.some((p) => p.priority);

  return (
    <div className="usa-page">
      <div className="usa-page-header">
        <div>
          <h1 className="usa-page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="lightbulb" color="var(--usa-primary)" size={26} />
            Projects
          </h1>
          <p className="usa-page-subtitle">
            {statsLoading ? '…' : `${stats?.total ?? 0} total · ${stats?.inProgress ?? 0} in progress`}
          </p>
        </div>
        {canEdit && (
          <button className="usa-button usa-button--primary" onClick={() => navigate('/projects/new')}>
            <Icon name="add" color="white" /> Add Project
          </button>
        )}
      </div>

      {/* ── Stat chips ── */}
      {!statsLoading && stats && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 'var(--space-3)', flexWrap: 'wrap' }}>
          <StatChip
            label="Total"
            value={stats.total}
            active={!status}
            onClick={() => setStatusFilter('')}
          />
          <StatChip
            label="In Progress"
            value={stats.inProgress}
            active={status === 'in_progress'}
            tone="success"
            onClick={() => setStatusFilter('in_progress')}
          />
          <StatChip
            label="On Hold"
            value={stats.onHold}
            active={status === 'on_hold'}
            tone="warning"
            onClick={() => setStatusFilter('on_hold')}
          />
          <StatChip
            label="Completed"
            value={stats.completed}
            active={status === 'completed'}
            onClick={() => setStatusFilter('completed')}
          />
          <StatChip
            label="Ending in 30 Days"
            value={stats.endingSoon}
            active={false}
            tone={stats.endingSoon > 0 ? 'danger' : 'neutral'}
            onClick={() => { setStatusFilter('in_progress'); setSortBy('endDate'); setSortDir('asc'); }}
          />
        </div>
      )}

      {/* ── Section cards ── */}
      {!statsLoading && stats && (stats.endingSoonProjects.length > 0 || stats.byProduct.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>

          {/* Ending soon */}
          {stats.endingSoonProjects.length > 0 && (
            <div className="detail-card" style={{ padding: 'var(--space-3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Ending Soon</h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--usa-base-dark)' }}>In-progress projects due within 30 days</p>
                </div>
                <Icon name="schedule" size={18} color="var(--usa-warning-dark)" />
              </div>
              <div>
                {stats.endingSoonProjects.map((p) => (
                  <EndingSoonItem key={p.id} project={p} onClick={() => navigate(`/projects/${p.id}`)} />
                ))}
              </div>
            </div>
          )}

          {/* By application */}
          {stats.byProduct.length > 0 && (
            <div className="detail-card" style={{ padding: 'var(--space-3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>By Application</h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--usa-base-dark)' }}>Active projects per application</p>
                </div>
                <Icon name="bar_chart" size={18} color="var(--usa-primary)" />
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                {stats.byProduct.map((p) => (
                  <AppBar
                    key={p.id}
                    name={p.name}
                    count={p.count}
                    max={maxProductCount}
                    onClick={() => { setProductId(p.id); setPage(1); }}
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
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className="usa-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          <option value="in_progress">In Progress</option>
          <option value="on_hold">On Hold</option>
          <option value="completed">Completed</option>
        </select>
        <select className="usa-select" value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }}>
          <option value="">All Priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select className="usa-select" value={productId} onChange={(e) => { setProductId(e.target.value); setPage(1); }}>
          <option value="">All Applications</option>
          {products?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {(search || status || priority || productId) && (
          <button
            className="usa-button usa-button--unstyled"
            style={{ fontSize: 13, color: 'var(--usa-base-dark)', whiteSpace: 'nowrap' }}
            onClick={() => { setSearch(''); setStatus(''); setPriority(''); setProductId(''); setPage(1); }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ── Table ── */}
      {isLoading ? (
        <span className="usa-spinner" aria-label="Loading" />
      ) : (
        <>
          <div className="table-wrap">
            <table className="usa-table">
              <thead>
                <tr>
                  {([
                    ['name', 'Project Name'],
                    ['product', 'Application'],
                    ['status', 'Status'],
                    ...(hasPriorityData ? [['priority', 'Priority']] : []),
                    ['startDate', 'Start Date'],
                    ['endDate', 'End Date'],
                  ] as [string, string][]).map(([field, label]) => (
                    <th key={field} style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }} onClick={() => handleSort(field)}>
                      {label} <SortIcon field={field} active={sortBy === field} dir={sortDir} />
                    </th>
                  ))}
                  <th>Team</th>
                </tr>
              </thead>
              <tbody>
                {data?.data.map((p) => {
                  const days = daysUntil(p.endDate);
                  const endingSoonRow = p.status === 'in_progress' && days !== null && days <= 30;
                  return (
                    <tr key={p.id} onClick={() => navigate(`/projects/${p.id}`)} style={{ cursor: 'pointer' }}>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td>{p.product?.name || '—'}</td>
                      <td>
                        <span className={`status-badge status-badge--${p.status}`}>
                          {STATUS_LABELS[p.status] || p.status}
                        </span>
                      </td>
                      {hasPriorityData && <td style={{ textTransform: 'capitalize' }}>{p.priority || '—'}</td>}
                      <td>{p.startDate ? new Date(p.startDate).toLocaleDateString() : '—'}</td>
                      <td style={endingSoonRow ? { color: days! <= 7 ? 'var(--usa-error)' : 'var(--usa-warning-dark)', fontWeight: 700 } : undefined}>
                        {p.endDate ? new Date(p.endDate).toLocaleDateString() : '—'}
                        {endingSoonRow && <span style={{ marginLeft: 6, fontSize: 11 }}>({days}d)</span>}
                      </td>
                      <td>{p.teamSize}</td>
                    </tr>
                  );
                })}
                {data?.data.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--usa-base-dark)' }}>No projects found.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {data && data.meta.pages > 1 && (
            <div className="pagination">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="usa-button usa-button--outline">Previous</button>
              <span>Page {page} of {data.meta.pages}</span>
              <button disabled={page >= data.meta.pages} onClick={() => setPage(page + 1)} className="usa-button usa-button--outline">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
