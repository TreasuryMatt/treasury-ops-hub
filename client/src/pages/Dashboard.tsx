import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../api/admin';

function StatCard({ label, value, detail, color }: { label: string; value: string | number; detail?: string; color?: string }) {
  return (
    <div className="stat-card" style={{ borderTopColor: color || 'var(--usa-primary)' }}>
      <div className="stat-card__value">{value}</div>
      <div className="stat-card__label">{label}</div>
      {detail && <div className="stat-card__detail">{detail}</div>}
    </div>
  );
}

function UtilizationBar({ label, value, count }: { label: string; value: number; count: number }) {
  const pct = Math.round(value * 100);
  const barColor = pct > 100 ? 'var(--usa-error)' : pct > 80 ? 'var(--usa-warning)' : 'var(--usa-success)';

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 14 }}>
        <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{label}</span>
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
        <StatCard label="Total Resources" value={stats.totalResources} detail={`${stats.federalCount} Federal / ${stats.contractorCount} Contractor`} />
        <StatCard label="Active Projects" value={stats.totalProjects} color="var(--usa-accent-cool-dark)" />
        <StatCard label="Avg Utilization" value={`${Math.round(stats.avgUtilization * 100)}%`} color={stats.avgUtilization > 0.8 ? 'var(--usa-warning)' : 'var(--usa-success)'} />
        <StatCard label="Available Resources" value={stats.availableResources} detail={stats.overCapacity > 0 ? `${stats.overCapacity} over capacity` : undefined} color="var(--usa-success)" />
      </div>

      <div style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 18, marginBottom: 16 }}>Utilization by Division</h2>
        {stats.byDivision.map((d) => (
          <UtilizationBar key={d.division} label={d.division} value={d.avgUtilization} count={d.count} />
        ))}
      </div>

      <div style={{ marginTop: 32, display: 'flex', gap: 12 }}>
        <button className="usa-button" onClick={() => navigate('/resources')}>View All Resources</button>
        <button className="usa-button usa-button--outline" onClick={() => navigate('/projects')}>View All Projects</button>
      </div>
    </div>
  );
}
