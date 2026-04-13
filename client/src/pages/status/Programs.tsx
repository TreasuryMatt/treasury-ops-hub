import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { programsApi } from '../../api/programs';
import { portfoliosApi } from '../../api/portfolios';
import { useAuth } from '../../context/AuthContext';
import { Program, Portfolio } from '../../types';
import { Icon } from '../../components/Icon';

// Deterministic accent color from program name
const ACCENTS = [
  '#005ea2', '#2e6276', '#1b4332', '#7b3f00', '#5c1a1a',
  '#3d4551', '#0e5f3f', '#4a1e6a', '#8b4513', '#1a3a5c',
];
function accentFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return ACCENTS[hash % ACCENTS.length];
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

const STATUS_COLORS: Record<string, string> = {
  green:  'var(--usa-success)',
  yellow: 'var(--usa-warning-dark)',
  red:    'var(--usa-error)',
  gray:   'var(--usa-base)',
};
const STATUS_LABELS: Record<string, string> = {
  green:  'On Track',
  yellow: 'At Risk',
  red:    'Off Track',
  gray:   'No Status',
};

function ProjectStatusBar({ projects }: { projects: { status: string }[] }) {
  const counts: Record<string, number> = { green: 0, yellow: 0, red: 0, gray: 0 };
  for (const p of projects) counts[p.status] = (counts[p.status] ?? 0) + 1;

  const total = projects.length;
  const hasAny = total > 0;

  return (
    <div className="prog-card__status">
      {hasAny ? (
        <>
          <div className="prog-card__status-bar">
            {(['red', 'yellow', 'green', 'gray'] as const).map((s) =>
              counts[s] > 0 ? (
                <div
                  key={s}
                  className="prog-card__status-segment"
                  style={{
                    background: STATUS_COLORS[s],
                    flex: counts[s],
                  }}
                  title={`${counts[s]} ${STATUS_LABELS[s]}`}
                />
              ) : null
            )}
          </div>
          <div className="prog-card__status-legend">
            {(['red', 'yellow', 'green', 'gray'] as const).map((s) =>
              counts[s] > 0 ? (
                <span key={s} className="prog-card__status-chip" style={{ color: STATUS_COLORS[s] }}>
                  <span className="prog-card__status-dot" style={{ background: STATUS_COLORS[s] }} />
                  {counts[s]} {STATUS_LABELS[s]}
                </span>
              ) : null
            )}
          </div>
        </>
      ) : (
        <span className="prog-card__no-projects">No projects</span>
      )}
    </div>
  );
}

function ProgramCard({ program }: { program: Program }) {
  const navigate = useNavigate();
  const accent = accentFor(program.name);
  const projects = program.statusProjects ?? [];

  return (
    <article
      className="prog-card"
      onClick={() => navigate(`/status/programs/${program.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/status/programs/${program.id}`)}
      aria-label={`${program.name} — ${projects.length} project${projects.length !== 1 ? 's' : ''}`}
    >
      {/* Logo / initials banner */}
      <div className="prog-card__banner" style={{ background: program.logoUrl ? undefined : accent }}>
        {program.logoUrl ? (
          <img src={program.logoUrl} alt={`${program.name} logo`} className="prog-card__logo" />
        ) : (
          <span className="prog-card__initials">{initials(program.name)}</span>
        )}
      </div>

      <div className="prog-card__body">
        <div className="prog-card__header">
          <h3 className="prog-card__name">{program.name}</h3>
          {program.portfolio && (
            <span className="prog-card__portfolio-badge">{program.portfolio.name}</span>
          )}
        </div>

        {program.federalOwner && (
          <p className="prog-card__meta">
            <Icon name="person_add" size={13} color="var(--usa-base)" />
            {program.federalOwner}
          </p>
        )}

        {program.description && (
          <p className="prog-card__desc">{program.description}</p>
        )}
      </div>

      <div className="prog-card__footer">
        <span className="prog-card__project-count">
          {projects.length} project{projects.length !== 1 ? 's' : ''}
        </span>
        <ProjectStatusBar projects={projects} />
      </div>
    </article>
  );
}

export function Programs() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = user?.role === 'editor' || user?.role === 'manager' || user?.role === 'admin';

  const { data: programs = [], isLoading } = useQuery<Program[]>({
    queryKey: ['programs'],
    queryFn: programsApi.list,
  });
  const { data: portfolios = [] } = useQuery<Portfolio[]>({
    queryKey: ['portfolios'],
    queryFn: portfoliosApi.list,
  });

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
          <button className="usa-button usa-button--outline usa-button--sm" onClick={() => navigate('/status/programs/new')}>
            + New Program
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
          {portfolios.filter((pf) => grouped.byPortfolio[pf.id]?.length).map((pf) => (
            <div key={pf.id} style={{ marginBottom: 'var(--space-5)' }}>
              <div className="section-header">
                <h2 className="section-title">{pf.name}</h2>
              </div>
              <div className="prog-card-grid">
                {grouped.byPortfolio[pf.id].map((prog) => (
                  <ProgramCard key={prog.id} program={prog} />
                ))}
              </div>
            </div>
          ))}

          {grouped.unassigned.length > 0 && (
            <div>
              {hasGrouped && (
                <div className="section-header">
                  <h2 className="section-title">No Portfolio</h2>
                </div>
              )}
              <div className="prog-card-grid">
                {grouped.unassigned.map((prog) => (
                  <ProgramCard key={prog.id} program={prog} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
