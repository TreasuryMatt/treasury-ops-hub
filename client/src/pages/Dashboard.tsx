import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../api/admin';
import { formatDivision } from '../utils/format';

function StatCard({ label, value, detail, color, onClick }: { label: string; value: string | number; detail?: string; color?: string; onClick?: () => void }) {
  const card = (
    <div className="stat-card" style={{ borderTopColor: color || 'var(--usa-primary)' }}>
      <div className="stat-card__value">{value}</div>
      <div className="stat-card__label">{label}</div>
      {detail && <div className="stat-card__detail">{detail}</div>}
    </div>
  );
  if (onClick) {
    return (
      <button className="stat-card--link" onClick={onClick}>
        {card}
      </button>
    );
  }
  return card;
}

function UtilizationBar({ label, value, count }: { label: string; value: number; count: number }) {
  const pct = Math.round(value * 100);
  const barColor = pct > 100 ? 'var(--usa-error)' : pct >= 80 ? 'var(--usa-success)' : pct >= 50 ? 'var(--usa-warning)' : 'var(--usa-error)';

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 14 }}>
        <span style={{ fontWeight: 600 }}>{formatDivision(label)}</span>
        <span>{pct}% avg ({count} resources)</span>
      </div>
      <div style={{ background: 'var(--usa-base-lightest)', borderRadius: 4, height: 12, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: barColor, borderRadius: 4, transition: 'width .3s' }} />
      </div>
    </div>
  );
}

export function Dashboard() {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => adminApi.stats(),
  });

  if (isLoading || !stats) {
    return (
      <div className="usa-page">
        <div className="usa-page-header"><h1 className="usa-page-title">Dashboard</h1></div>
        <span className="usa-spinner" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="usa-page">
      <div className="usa-page-header">
        <h1 className="usa-page-title">Dashboard</h1>
        <p className="usa-page-subtitle">Capacity Management Overview</p>
      </div>

      <div className="stat-grid">
        <StatCard label="Total Resources" value={stats.totalResources} detail={`${stats.federalCount} Federal / ${stats.contractorCount} Contractor`} onClick={() => navigate('/staffing/resources')} />
        <StatCard label="Active Projects" value={stats.totalProjects} color="var(--usa-accent-cool-dark)" onClick={() => navigate('/projects')} />
        <StatCard
          label="Avg Utilization"
          value={`${Math.round(stats.avgUtilization * 100)}%`}
          detail={stats.avgUtilization >= 0.8 ? 'Healthy — above 80%' : stats.avgUtilization >= 0.5 ? 'Underutilized — below 80%' : '⚠ Critical — below 50%'}
          color={stats.avgUtilization >= 0.8 ? 'var(--usa-success)' : stats.avgUtilization >= 0.5 ? 'var(--usa-warning)' : 'var(--usa-error)'}
          onClick={() => navigate('/staffing/resources?sortBy=totalPercentUtilized&sortDir=desc')}
        />
        <StatCard label="Available Resources" value={stats.availableResources} detail={stats.overCapacity > 0 ? `${stats.overCapacity} over capacity` : undefined} color="var(--usa-success)" onClick={() => navigate('/staffing/resources?sortBy=availableCapacity&sortDir=desc')} />
        <StatCard label="Ending Within 30 Days" value={stats.endingSoonProjects} color={stats.endingSoonProjects > 0 ? 'var(--usa-warning)' : 'var(--usa-success)'} onClick={() => navigate('/projects?sortBy=endDate&sortDir=asc')} />
      </div>

      <div style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 18, marginBottom: 16 }}>Utilization by Division</h2>
        {stats.byDivision.map((d) => (
          <UtilizationBar key={d.division} label={d.division} value={d.avgUtilization} count={d.count} />
        ))}
      </div>

      <div style={{ marginTop: 32, display: 'flex', gap: 12 }}>
        <button className="usa-button usa-button--outline" onClick={() => navigate('/staffing/resources')}>View All Resources</button>
        <button className="usa-button usa-button--outline" onClick={() => navigate('/projects')}>View All Projects</button>
      </div>
    </div>
  );
}
