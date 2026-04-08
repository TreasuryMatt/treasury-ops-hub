import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { programsApi } from '../../api/programs';
import { portfoliosApi } from '../../api/portfolios';
import { useAuth } from '../../context/AuthContext';
import { Program, Portfolio } from '../../types';
import { Icon } from '../../components/Icon';

export function Programs() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = user?.role === 'editor' || user?.role === 'admin';

  const { data: programs = [], isLoading } = useQuery<Program[]>({
    queryKey: ['programs'],
    queryFn: programsApi.list,
  });
  const { data: portfolios = [] } = useQuery<Portfolio[]>({
    queryKey: ['portfolios'],
    queryFn: portfoliosApi.list,
  });

  // Group programs by portfolio
  const grouped = React.useMemo(() => {
    const byPortfolio: Record<string, Program[]> = {};
    const unassigned: Program[] = [];
    for (const p of programs) {
      if (p.portfolioId) {
        if (!byPortfolio[p.portfolioId]) byPortfolio[p.portfolioId] = [];
        byPortfolio[p.portfolioId].push(p);
      } else {
        unassigned.push(p);
      }
    }
    return { byPortfolio, unassigned };
  }, [programs]);

  if (isLoading) {
    return <div className="page-loading"><span className="usa-spinner" aria-label="Loading" /> Loading...</div>;
  }

  const hasGrouped = portfolios.some((pf) => grouped.byPortfolio[pf.id]?.length);

  return (
    <div className="usa-page">
      <div className="usa-page-header">
        <div>
          <h1 className="usa-page-title">Programs</h1>
          <p className="usa-page-subtitle">{programs.length} program{programs.length !== 1 ? 's' : ''}</p>
        </div>
        {canEdit && (
          <button className="usa-button" onClick={() => navigate('/status/programs/new')}>
            <Icon name="add" size={16} /> New Program
          </button>
        )}
      </div>

      {programs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon"><Icon name="folder_open" size={48} /></div>
          <h3>No programs yet</h3>
          <p>Create a program to organize your status projects.</p>
        </div>
      ) : (
        <>
          {/* Programs grouped by portfolio */}
          {portfolios.filter((pf) => grouped.byPortfolio[pf.id]?.length).map((pf) => (
            <div key={pf.id} style={{ marginBottom: 'var(--space-4)' }}>
              <div className="section-header">
                <h2 className="section-title">{pf.name}</h2>
              </div>
              <div className="table-wrap">
                <table className="usa-table">
                  <thead>
                    <tr>
                      <th>Program</th>
                      <th>Description</th>
                      <th>Projects</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grouped.byPortfolio[pf.id].map((prog) => (
                      <tr key={prog.id} onClick={() => navigate(`/status/programs/${prog.id}`)} style={{ cursor: 'pointer' }}>
                        <td style={{ fontWeight: 600 }}>{prog.name}</td>
                        <td className="text-muted">{prog.description || '—'}</td>
                        <td>{prog.statusProjects?.length ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* Unassigned programs */}
          {grouped.unassigned.length > 0 && (
            <div>
              {hasGrouped && (
                <div className="section-header">
                  <h2 className="section-title">No Portfolio</h2>
                </div>
              )}
              <div className="table-wrap">
                <table className="usa-table">
                  <thead>
                    <tr>
                      <th>Program</th>
                      <th>Description</th>
                      <th>Projects</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grouped.unassigned.map((prog) => (
                      <tr key={prog.id} onClick={() => navigate(`/status/programs/${prog.id}`)} style={{ cursor: 'pointer' }}>
                        <td style={{ fontWeight: 600 }}>{prog.name}</td>
                        <td className="text-muted">{prog.description || '—'}</td>
                        <td>{prog.statusProjects?.length ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
