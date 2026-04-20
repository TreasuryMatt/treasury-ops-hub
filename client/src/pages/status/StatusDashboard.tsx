import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { statusAdminApi } from '../../api/statusAdmin';
import { StatusDashboardStats, StatusProjectStatusType } from '../../types';
import { Icon } from '../../components/Icon';

const RAG_LABELS: Record<StatusProjectStatusType, string> = {
  initiated: 'Initiated',
  green: 'On Track',
  yellow: 'At Risk',
  red: 'Off Track',
  gray: 'Not Started',
};

const RAG_COLORS: Record<StatusProjectStatusType, string> = {
  initiated: 'var(--usa-info)',
  green: 'var(--usa-success)',
  yellow: 'var(--usa-warning)',
  red: 'var(--usa-error)',
  gray: 'var(--usa-base)',
};

function RagDot({ status }: { status: StatusProjectStatusType }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 10,
        height: 10,
        borderRadius: '50%',
        backgroundColor: RAG_COLORS[status],
        flexShrink: 0,
      }}
      title={RAG_LABELS[status]}
    />
  );
}

export function StatusDashboard() {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useQuery<StatusDashboardStats>({
    queryKey: ['status-dashboard-stats'],
    queryFn: statusAdminApi.dashboardStats,
  });

  if (isLoading) {
    return <div className="page-loading"><span className="usa-spinner" aria-label="Loading" /> Loading...</div>;
  }

  if (!stats) return null;

  return (
    <div className="usa-page">
      <div className="usa-page-header">
        <div>
          <h1 className="usa-page-title">Project Status Dashboard</h1>
          <p className="usa-page-subtitle">{stats.totalProjects} project{stats.totalProjects !== 1 ? 's' : ''} tracked</p>
        </div>
        <button className="usa-button usa-button--outline usa-button--sm" onClick={() => navigate('/status/projects')}>
          View All Projects
        </button>
      </div>

      {/* Summary Stats */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
        <div className="stat-card stat-card--clickable" onClick={() => navigate('/status/projects')}>
          <div className="stat-card__value">{stats.totalProjects}</div>
          <div className="stat-card__label">Total Projects</div>
        </div>
        <div className="stat-card stat-card--clickable" style={{ borderTopColor: 'var(--usa-success)' }} onClick={() => navigate('/status/projects?status=green')}>
          <div className="stat-card__value" style={{ color: 'var(--usa-success-dark)' }}>{stats.greenCount}</div>
          <div className="stat-card__label">On Track</div>
        </div>
        <div className="stat-card stat-card--clickable" style={{ borderTopColor: 'var(--usa-warning-dark)' }} onClick={() => navigate('/status/projects?status=yellow')}>
          <div className="stat-card__value" style={{ color: 'var(--usa-warning-darker)' }}>{stats.yellowCount}</div>
          <div className="stat-card__label">At Risk</div>
        </div>
        <div className="stat-card stat-card--clickable" style={{ borderTopColor: 'var(--usa-error)' }} onClick={() => navigate('/status/projects?status=red')}>
          <div className="stat-card__value" style={{ color: 'var(--usa-error)' }}>{stats.redCount}</div>
          <div className="stat-card__label">Off Track</div>
        </div>
        <div className={`stat-card stat-card--clickable${stats.overdueUpdates > 0 ? ' danger' : ''}`} onClick={() => navigate('/status/projects?status=overdue')}>
          <div className={`stat-card__value${stats.overdueUpdates > 0 ? ' danger' : ''}`}>{stats.overdueUpdates}</div>
          <div className="stat-card__label">Overdue Updates</div>
        </div>
      </div>

      {/* Program Cards */}
      <div className="section-header" style={{ marginTop: 'var(--space-4)' }}>
        <h2 className="section-title">Programs</h2>
        <button className="usa-button usa-button--outline usa-button--sm" onClick={() => navigate('/status/programs')}>
          View All Programs
        </button>
      </div>

      {stats.programSummaries.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon"><Icon name="folder_open" size={48} /></div>
          <h3>No programs yet</h3>
          <p>Create a program to start tracking project status.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
          {stats.programSummaries.map((prog) => (
            <div
              key={prog.id}
              className="detail-card"
              style={{ cursor: 'pointer', transition: 'box-shadow 0.15s' }}
              onClick={() => navigate(`/status/programs/${prog.id}`)}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow-2)')}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow-1)')}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--usa-primary-darker)' }}>{prog.name}</span>
                <RagDot status={prog.worstStatus as StatusProjectStatusType} />
              </div>
              <div style={{ fontSize: 13, color: 'var(--usa-base-dark)' }}>
                {prog.projectCount} project{prog.projectCount !== 1 ? 's' : ''}
              </div>
              {prog.lastUpdateDate && (
                <div style={{ fontSize: 12, color: 'var(--usa-base)', marginTop: 4 }}>
                  Last update: {new Date(prog.lastUpdateDate).toLocaleDateString()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upcoming Milestones */}
      {stats.upcomingMilestones.length > 0 && (
        <>
          <div className="section-header">
            <h2 className="section-title">Upcoming Milestones</h2>
            <span className="text-muted text-sm">Next 2 weeks</span>
          </div>
          <div className="table-wrap">
            <table className="usa-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Phase / Milestone</th>
                  <th>End Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.upcomingMilestones.map((m, i) => (
                  <tr key={i} onClick={() => navigate(`/status/projects/${m.projectId}`)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 600 }}>{m.projectName}</td>
                    <td>{m.phaseName}</td>
                    <td>{new Date(m.endDate).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
