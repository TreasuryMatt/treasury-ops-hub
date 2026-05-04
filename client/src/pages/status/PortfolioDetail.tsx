import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { portfoliosApi } from '../../api/portfolios';
import { useAuth } from '../../context/AuthContext';
import { Portfolio } from '../../types';
import { Icon } from '../../components/Icon';
import { RagBadge } from '../../components/RagBadge';

const STATUS_COLORS: Record<string, string> = {
  initiated: 'var(--usa-info)',
  green:  'var(--usa-success)',
  yellow: 'var(--usa-warning-dark)',
  red:    'var(--usa-error)',
  gray:   'var(--usa-base)',
};
const STATUS_LABELS: Record<string, string> = {
  initiated: 'Initiated', green: 'On Track', yellow: 'At Risk', red: 'Off Track', gray: 'No Status',
};

function worstStatus(projects: { status: string }[]): string {
  const order = ['red', 'yellow', 'initiated', 'green', 'gray'];
  for (const s of order) {
    if (projects.some((p) => p.status === s)) return s;
  }
  return 'gray';
}

export function PortfolioDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = user?.role === 'editor' || user?.role === 'manager' || user?.role === 'admin';

  const { data: portfolio, isLoading } = useQuery<Portfolio>({
    queryKey: ['portfolio', id],
    queryFn: () => portfoliosApi.get(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return <div className="page-loading"><span className="usa-spinner" aria-label="Loading" /> Loading...</div>;
  }

  if (!portfolio) {
    return <div className="usa-page"><p>Portfolio not found.</p></div>;
  }

  const programs = portfolio.programs ?? [];
  const allProjects = programs.flatMap((prog: any) => prog.statusProjects ?? []);
  const counts: Record<string, number> = { red: 0, yellow: 0, green: 0, initiated: 0, gray: 0 };
  for (const p of allProjects) counts[p.status] = (counts[p.status] ?? 0) + 1;

  return (
    <div className="usa-page">
      <div className="usa-page-header">
        <div>
          <button
            className="usa-button usa-button--unstyled"
            onClick={() => navigate('/status/portfolios')}
            style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <Icon name="arrow_back" size={16} /> Back to Portfolios
          </button>
          <h1 className="usa-page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="work" color="var(--usa-primary)" size={24} />
            {portfolio.name}
          </h1>
          {portfolio.owner && (
            <p className="usa-page-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="person" size={14} color="var(--usa-base)" /> Manager: {portfolio.owner}
            </p>
          )}
          {portfolio.budget !== null && portfolio.budget !== undefined && (
            <p className="usa-page-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="attach_money" size={14} color="var(--usa-base)" />
              Budget: {Number(portfolio.budget).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
            </p>
          )}
          {portfolio.description && (
            <p className="usa-page-subtitle">{portfolio.description}</p>
          )}
        </div>
        {canEdit && (
          <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
            <button className="usa-button usa-button--outline" onClick={() => navigate(`/status/portfolios/${id}/edit`)}>
              <Icon name="edit" size={16} /> Edit
            </button>
            <button className="usa-button" onClick={() => navigate(`/status/programs/new?portfolioId=${id}`)}>
              <Icon name="add" size={16} /> New Program
            </button>
          </div>
        )}
      </div>

      {/* Health summary */}
      {allProjects.length > 0 && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 'var(--space-3)' }}>
          {(['red', 'yellow', 'green', 'initiated', 'gray'] as const).map((s) =>
            counts[s] > 0 ? (
              <div
                key={s}
                style={{
                  padding: '8px 14px',
                  borderRadius: 6,
                  background: 'var(--card-bg)',
                  border: `2px solid ${STATUS_COLORS[s]}`,
                  fontSize: 13,
                }}
              >
                <span style={{ fontWeight: 700, color: STATUS_COLORS[s] }}>{counts[s]}</span>
                <span style={{ marginLeft: 6, color: 'var(--usa-base-dark)' }}>{STATUS_LABELS[s]}</span>
              </div>
            ) : null
          )}
        </div>
      )}

      {/* Programs table */}
      <div className="section-header">
        <h2 className="section-title">Programs ({programs.length})</h2>
      </div>

      {programs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon"><Icon name="folder_open" size={48} /></div>
          <h3>No programs yet</h3>
          <p>Create a program and assign it to this portfolio.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="usa-table">
            <thead>
              <tr>
                <th>Program</th>
                <th>Manager / Owner</th>
                <th>Projects</th>
                <th>Health</th>
                {canEdit && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {programs.map((prog: any) => {
                const projs: { status: string }[] = prog.statusProjects ?? [];
                const worst = worstStatus(projs);
                return (
                  <tr key={prog.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/status/programs/${prog.id}`)}>
                    <td style={{ fontWeight: 600 }}>{prog.name}</td>
                    <td>{prog.federalOwner || '—'}</td>
                    <td>{projs.length}</td>
                    <td>
                      {projs.length > 0 ? (
                        <RagBadge status={worst as any} />
                      ) : (
                        <span style={{ color: 'var(--usa-base)', fontSize: 13 }}>—</span>
                      )}
                    </td>
                    {canEdit && (
                      <td onClick={(e) => e.stopPropagation()}>
                        <button
                          className="usa-button usa-button--unstyled"
                          onClick={() => navigate(`/status/programs/${prog.id}/edit`)}
                        >
                          Edit
                        </button>
                      </td>
                    )}
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
