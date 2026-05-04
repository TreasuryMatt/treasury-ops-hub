import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { portfoliosApi } from '../../api/portfolios';
import { useAuth } from '../../context/AuthContext';
import { Portfolio } from '../../types';
import { Icon } from '../../components/Icon';

const STATUS_COLORS: Record<string, string> = {
  initiated: 'var(--usa-info)',
  green:  'var(--usa-success)',
  yellow: 'var(--usa-warning-dark)',
  red:    'var(--usa-error)',
  gray:   'var(--usa-base)',
};

function PortfolioHealthBar({ programs }: { programs: Portfolio['programs'] }) {
  const allProjects = (programs ?? []).flatMap((prog: any) => prog.statusProjects ?? []);
  if (allProjects.length === 0) {
    return <span style={{ fontSize: 12, color: 'var(--usa-base)' }}>No projects</span>;
  }

  const counts: Record<string, number> = { red: 0, yellow: 0, green: 0, initiated: 0, gray: 0 };
  for (const p of allProjects) counts[p.status] = (counts[p.status] ?? 0) + 1;

  return (
    <div>
      <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 4 }}>
        {(['red', 'yellow', 'green', 'initiated', 'gray'] as const).map((s) =>
          counts[s] > 0 ? (
            <div
              key={s}
              style={{ flex: counts[s], background: STATUS_COLORS[s] }}
              title={`${counts[s]} ${s}`}
            />
          ) : null
        )}
      </div>
      <div style={{ fontSize: 11, color: 'var(--usa-base-dark)' }}>
        {allProjects.length} project{allProjects.length !== 1 ? 's' : ''} across{' '}
        {(programs ?? []).length} program{(programs ?? []).length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

function PortfolioCard({ portfolio }: { portfolio: Portfolio }) {
  const navigate = useNavigate();

  return (
    <article
      className="detail-card"
      style={{ cursor: 'pointer', transition: 'box-shadow 0.15s', padding: 'var(--space-3)' }}
      onClick={() => navigate(`/status/portfolios/${portfolio.id}`)}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow-2)')}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow-1)')}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/status/portfolios/${portfolio.id}`)}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="work" color="var(--usa-primary)" size={20} />
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--usa-primary-dark)' }}>{portfolio.name}</span>
        </div>
        <span style={{ fontSize: 12, color: 'var(--usa-base-dark)', whiteSpace: 'nowrap' }}>
          {(portfolio.programs ?? []).length} program{(portfolio.programs ?? []).length !== 1 ? 's' : ''}
        </span>
      </div>

      {portfolio.owner && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--usa-base-dark)', marginBottom: 6 }}>
          <Icon name="person" size={14} color="var(--usa-base)" />
          {portfolio.owner}
        </div>
      )}

      {portfolio.budget !== null && portfolio.budget !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--usa-base-dark)', marginBottom: 6 }}>
          <Icon name="attach_money" size={14} color="var(--usa-base)" />
          {Number(portfolio.budget).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
        </div>
      )}

      {portfolio.description && (
        <p style={{ fontSize: 13, color: 'var(--usa-base-dark)', margin: '0 0 10px', lineHeight: 1.5 }}>
          {portfolio.description}
        </p>
      )}

      <PortfolioHealthBar programs={portfolio.programs} />
    </article>
  );
}

export function Portfolios() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = user?.role === 'editor' || user?.role === 'manager' || user?.role === 'admin';

  const { data: portfolios = [], isLoading } = useQuery<Portfolio[]>({
    queryKey: ['portfolios'],
    queryFn: portfoliosApi.list,
  });

  if (isLoading) {
    return <div className="page-loading"><span className="usa-spinner" aria-label="Loading" /> Loading...</div>;
  }

  return (
    <div className="usa-page">
      <div className="usa-page-header">
        <div>
          <h1 className="usa-page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="work" color="var(--usa-primary)" size={26} />
            Portfolios
          </h1>
          <p className="usa-page-subtitle">{portfolios.length} portfolio{portfolios.length !== 1 ? 's' : ''}</p>
        </div>
        {canEdit && (
          <button className="usa-button usa-button--outline usa-button--sm" onClick={() => navigate('/status/portfolios/new')}>
            + New Portfolio
          </button>
        )}
      </div>

      {portfolios.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon"><Icon name="work" size={48} /></div>
          <h3>No portfolios yet</h3>
          <p>Create a portfolio to organize your programs.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-3)' }}>
          {portfolios.map((portfolio) => (
            <PortfolioCard key={portfolio.id} portfolio={portfolio} />
          ))}
        </div>
      )}
    </div>
  );
}
