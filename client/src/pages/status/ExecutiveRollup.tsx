import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { statusAdminApi } from '../../api/statusAdmin';
import { programsApi } from '../../api/programs';
import { Program, StatusProjectStatusType, IssueCategory, Application } from '../../types';
import { RagBadge } from '../../components/RagBadge';
import { Icon } from '../../components/Icon';

type WindowOption = 'week' | 'biweek' | 'month' | 'custom';

interface RollupIssue {
  id: string;
  category: IssueCategory;
  text: string;
  createdAt: string;
  author?: { id: string; displayName: string };
  resolvedAt?: string | null;
  resolvedBy?: { id: string; displayName: string } | null;
  resolutionNotes?: string | null;
}

interface RollupUpdate {
  id: string;
  overallStatus: StatusProjectStatusType;
  summary: string;
  risks: string | null;
  blockers: string | null;
  createdAt: string;
  author?: { id: string; displayName: string };
}

interface RollupAccomplishment {
  id: string;
  text: string;
  createdAt: string;
  author?: { id: string; displayName: string };
}

interface StaffingRisk {
  fteCount: number;
  contractorCount: number;
  overAllocated: { id: string; name: string; totalPercent: number }[];
  popExpiring: { id: string; name: string; popEndDate: string; daysRemaining: number }[];
}

interface RollupProject {
  id: string;
  name: string;
  status: StatusProjectStatusType;
  previousStatus: StatusProjectStatusType | null;
  nextUpdateDue: string | null;
  owner: { id: string; displayName: string } | null;
  application: Application | null;
  updates: RollupUpdate[];
  accomplishments: RollupAccomplishment[];
  issues: RollupIssue[];
  risks: RollupIssue[];
  blockers: RollupIssue[];
  resolvedIssues: RollupIssue[];
  staffing: StaffingRisk | null;
}

type TrendDirection = 'improving' | 'stable' | 'degrading';

const STATUS_RANK: Record<StatusProjectStatusType, number> = { red: 0, yellow: 1, initiated: 1, green: 2, gray: -1 };

function getTrend(current: StatusProjectStatusType, previous: StatusProjectStatusType | null): TrendDirection | null {
  if (!previous || current === 'gray' || previous === 'gray' || current === 'initiated' || previous === 'initiated') return null;
  const diff = STATUS_RANK[current] - STATUS_RANK[previous];
  if (diff > 0) return 'improving';
  if (diff < 0) return 'degrading';
  return 'stable';
}

function TrendArrow({ trend }: { trend: TrendDirection | null }) {
  if (!trend) return null;
  const config = {
    improving: { symbol: '↑', className: 'trend-arrow--improving', title: 'Improving' },
    stable: { symbol: '→', className: 'trend-arrow--stable', title: 'Stable' },
    degrading: { symbol: '↓', className: 'trend-arrow--degrading', title: 'Degrading' },
  };
  const { symbol, className, title } = config[trend];
  return <span className={`trend-arrow ${className}`} title={title}>{symbol}</span>;
}

type AttentionFlagType = 'degraded' | 'blocker' | 'overdue' | 'noActivity' | 'overAllocated' | 'popExpiring';

const FLAG_CONFIG: Record<AttentionFlagType, { label: string; bg: string; color: string; priority: number }> = {
  degraded:      { label: '↓ Degraded',      bg: 'var(--usa-error)',          color: '#fff',                    priority: 0 },
  blocker:       { label: '⊘ Blocker',       bg: 'var(--usa-error)',          color: '#fff',                    priority: 1 },
  overdue:       { label: '⚠ Overdue',       bg: 'var(--usa-warning-dark)',   color: 'var(--usa-base-darkest)', priority: 2 },
  overAllocated: { label: '⚠ Over-Allocated', bg: 'var(--usa-warning-dark)',  color: 'var(--usa-base-darkest)', priority: 2 },
  popExpiring:   { label: '⏳ POP Expiring',  bg: 'var(--usa-warning)',        color: 'var(--usa-base-darkest)', priority: 2 },
  noActivity:    { label: '○ No Activity',   bg: 'var(--usa-base-light)',     color: 'var(--usa-base-darkest)', priority: 3 },
};

interface AttentionItem {
  project: RollupProject;
  programName: string;
  flags: AttentionFlagType[];
}

function buildAttentionItems(rollupPrograms: RollupProgram[], now: Date): AttentionItem[] {
  const items: AttentionItem[] = [];
  for (const prog of rollupPrograms) {
    for (const project of prog.projects) {
      const flags: AttentionFlagType[] = [];
      if (getTrend(project.status, project.previousStatus) === 'degrading') flags.push('degraded');
      if (project.blockers.length > 0) flags.push('blocker');
      if (project.nextUpdateDue && new Date(project.nextUpdateDue) < now) flags.push('overdue');
      const hasActivity =
        project.updates.length > 0 ||
        project.accomplishments.length > 0 ||
        project.issues.length > 0 ||
        project.risks.length > 0 ||
        project.blockers.length > 0 ||
        (project.resolvedIssues?.length ?? 0) > 0;
      if (!hasActivity) flags.push('noActivity');
      if (project.staffing?.overAllocated.length) flags.push('overAllocated');
      if (project.staffing?.popExpiring.length)   flags.push('popExpiring');
      if (flags.length > 0) items.push({ project, programName: prog.name, flags });
    }
  }
  items.sort((a, b) => {
    const aPri = Math.min(...a.flags.map((f) => FLAG_CONFIG[f].priority));
    const bPri = Math.min(...b.flags.map((f) => FLAG_CONFIG[f].priority));
    return aPri - bPri;
  });
  return items;
}

function NeedsAttentionSection({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="rollup-attention">
      <div className="rollup-attention__header">
        <Icon name="flag" color="var(--usa-error)" size={15} />
        <span className="rollup-attention__title">Needs Attention</span>
        <span className="rollup-attention__count">{items.length} project{items.length !== 1 ? 's' : ''}</span>
      </div>
      {items.map(({ project, programName, flags }) => (
        <div key={project.id} className="rollup-attention__row">
          <RagBadge status={project.status} />
          <Link to={`/status/projects/${project.id}`} className="rollup-attention__project">{project.name}</Link>
          <span className="rollup-attention__program">{programName}</span>
          <div className="rollup-attention__flags">
            {flags.map((flag) => {
              const cfg = FLAG_CONFIG[flag];
              return (
                <span key={flag} className="rollup-attention__flag" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                  {cfg.label}
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

interface RollupProgram {
  id: string;
  name: string;
  projects: RollupProject[];
}

interface RollupSummary {
  windowStart: string;
  windowEnd: string;
  totalProjects: number;
  greenCount: number;
  yellowCount: number;
  redCount: number;
  grayCount: number;
  newAccomplishments: number;
  newUpdates: number;
  openIssues: number;
  openRisks: number;
  openBlockers: number;
  resolvedCount: number;
  staffingOverAllocatedProjects: number;
  staffingPopExpiringProjects: number;
}

interface RollupData {
  summary: RollupSummary;
  programs: RollupProgram[];
}

const WINDOW_LABELS: Record<WindowOption, string> = {
  week: 'This Week',
  biweek: 'Last 2 Weeks',
  month: 'This Month',
  custom: 'Custom Range',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function Section({
  title, color, icon, children,
}: {
  title: string; color: string; icon: string; children: React.ReactNode;
}) {
  return (
    <div className="rollup-section">
      <div className="rollup-section__header">
        <Icon name={icon} color={color} size={15} />
        <span className="rollup-section__title" style={{ color }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

const CATEGORY_BADGE_STYLES: Record<IssueCategory, { bg: string; color: string; label: string }> = {
  blocker: { bg: 'var(--usa-error)', color: '#fff', label: 'Blocker' },
  risk: { bg: 'var(--usa-warning)', color: 'var(--usa-base-darkest)', label: 'Risk' },
  issue: { bg: '#e66a00', color: '#fff', label: 'Issue' },
};

function CategoryBadge({ category }: { category: IssueCategory }) {
  const style = CATEGORY_BADGE_STYLES[category];
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 11,
        fontWeight: 700,
        padding: '1px 8px',
        borderRadius: 4,
        backgroundColor: style.bg,
        color: style.color,
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
        flexShrink: 0,
      }}
    >
      {style.label}
    </span>
  );
}

function EntryRow({ text, date, author, project, projectId, category }: { text: string; date: string; author?: string; project?: string; projectId?: string; category?: IssueCategory }) {
  return (
    <div className="rollup-entry">
      <span className="rollup-entry__text">
        {category && <CategoryBadge category={category} />}
        {' '}{text}
      </span>
      <span className="rollup-entry__meta">
        {project && projectId ? (
          <Link to={`/status/projects/${projectId}`} className="rollup-entry__project-link">{project}</Link>
        ) : project ? (
          <span className="rollup-entry__project">{project}</span>
        ) : null}
        {formatDate(date)}{author ? ` · ${author}` : ''}
      </span>
    </div>
  );
}

function ProjectCard({ project }: { project: RollupProject }) {
  const [open, setOpen] = useState(false);
  const trend = getTrend(project.status, project.previousStatus);
  const hasActivity =
    project.updates.length > 0 ||
    project.accomplishments.length > 0 ||
    project.issues.length > 0 ||
    project.risks.length > 0 ||
    project.blockers.length > 0 ||
    (project.resolvedIssues?.length ?? 0) > 0;

  return (
    <div className="rollup-project-card">
      <button className="rollup-project-card__header" onClick={() => setOpen((o) => !o)}>
        <RagBadge status={project.status} />
        <TrendArrow trend={trend} />
        <Link
          to={`/status/projects/${project.id}`}
          onClick={(e) => e.stopPropagation()}
          className="rollup-project-card__name"
        >
          {project.name}
        </Link>
        {project.owner && (
          <span className="rollup-project-card__owner">{project.owner.displayName}</span>
        )}
        {project.updates.length === 0 && (
          <span className="rollup-no-update-badge" title="No status update submitted in this time window">No update</span>
        )}
        {project.application && (
          <span className="rollup-project-card__apps">
            <span className="app-pill">{project.application.name}</span>
          </span>
        )}
        <span className="rollup-project-card__counts">
          {project.accomplishments.length > 0 && (
            <span className="rollup-count rollup-count--success" title="Successes">
              ✓ {project.accomplishments.length}
            </span>
          )}
          {project.updates.length > 0 && (
            <span className="rollup-count" title="Updates">
              ↺ {project.updates.length}
            </span>
          )}
          {project.blockers.length > 0 && (
            <span className="rollup-count rollup-count--error" title="Blockers">
              ⊘ {project.blockers.length}
            </span>
          )}
          {project.risks.length > 0 && (
            <span className="rollup-count rollup-count--warning" title="Risks">
              ⚠ {project.risks.length}
            </span>
          )}
          {project.issues.length > 0 && (
            <span className="rollup-count rollup-count--info" title="Issues">
              ● {project.issues.length}
            </span>
          )}
          {(project.resolvedIssues?.length ?? 0) > 0 && (
            <span className="rollup-count rollup-count--success" title="Resolved" style={{ opacity: 0.7 }}>
              ✓ {project.resolvedIssues.length} resolved
            </span>
          )}
        </span>
        <Icon name={open ? 'expand_less' : 'expand_more'} color="var(--usa-base-dark)" size={18} />
      </button>

      {open && (
        <div className="rollup-project-card__body">
          {!hasActivity && (
            <p className="rollup-empty-inline">No activity in this time window.</p>
          )}

          {project.accomplishments.length > 0 && (
            <Section title="Successes" color="var(--usa-success-dark)" icon="check_circle">
              {project.accomplishments.map((a) => (
                <EntryRow key={a.id} text={a.text} date={a.createdAt} author={a.author?.displayName} />
              ))}
            </Section>
          )}

          {project.updates.length > 0 && (
            <Section title="Status Updates" color="var(--usa-primary)" icon="update">
              {project.updates.map((u) => (
                <div key={u.id} className="rollup-update">
                  <div className="rollup-update__meta">
                    <RagBadge status={u.overallStatus} />
                    <span className="rollup-entry__meta">
                      {formatDate(u.createdAt)}{u.author ? ` · ${u.author.displayName}` : ''}
                    </span>
                  </div>
                  <p className="rollup-update__summary">{u.summary}</p>
                </div>
              ))}
            </Section>
          )}

          {project.blockers.length > 0 && (
            <Section title="Blockers" color="var(--usa-error)" icon="block">
              {project.blockers.map((b) => (
                <EntryRow key={b.id} text={b.text} date={b.createdAt} author={b.author?.displayName} />
              ))}
            </Section>
          )}

          {project.risks.length > 0 && (
            <Section title="Risks" color="var(--usa-warning-darker)" icon="warning">
              {project.risks.map((r) => (
                <EntryRow key={r.id} text={r.text} date={r.createdAt} author={r.author?.displayName} />
              ))}
            </Section>
          )}

          {project.issues.length > 0 && (
            <Section title="Issues" color="var(--usa-primary-vivid)" icon="report_problem">
              {project.issues.map((i) => (
                <EntryRow key={i.id} text={i.text} date={i.createdAt} author={i.author?.displayName} />
              ))}
            </Section>
          )}

          {(project.resolvedIssues?.length ?? 0) > 0 && (
            <Section title={`Recently Resolved (${project.resolvedIssues.length})`} color="var(--usa-success-dark)" icon="check_circle">
              {project.resolvedIssues.map((i) => (
                <div key={i.id} className="rollup-entry" style={{ opacity: 0.75 }}>
                  <span className="rollup-entry__text">
                    <CategoryBadge category={i.category} />
                    {' '}<span style={{ textDecoration: 'line-through' }}>{i.text}</span>
                    {i.resolutionNotes && (
                      <span style={{ fontStyle: 'italic', color: 'var(--usa-success-darker)', marginLeft: 8 }}>
                        Resolution: {i.resolutionNotes}
                      </span>
                    )}
                  </span>
                  <span className="rollup-entry__meta">
                    {i.resolvedAt && formatDate(i.resolvedAt)}{i.resolvedBy ? ` · ${i.resolvedBy.displayName}` : ''}
                  </span>
                </div>
              ))}
            </Section>
          )}

          {project.staffing && (
            <Section title="Staffing" color="var(--usa-base-dark)" icon="group">
              <div className="rollup-staffing__summary">
                👤 {project.staffing.fteCount} federal · {project.staffing.contractorCount} contractor{project.staffing.contractorCount !== 1 ? 's' : ''}
              </div>

              {project.staffing.overAllocated.length > 0 && (
                <div className="rollup-staffing__group">
                  <span className="rollup-staffing__group-label">Over-Allocated</span>
                  {project.staffing.overAllocated.map((r) => (
                    <div key={r.id} className="rollup-staffing__row">
                      <span className="rollup-staffing__name">{r.name}</span>
                      <span className="rollup-staffing__badge rollup-staffing__badge--danger">
                        {Math.round(r.totalPercent * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {project.staffing.popExpiring.length > 0 && (
                <div className="rollup-staffing__group">
                  <span className="rollup-staffing__group-label">POP Expiring (within 60 days)</span>
                  {project.staffing.popExpiring.map((r) => (
                    <div key={r.id} className="rollup-staffing__row">
                      <span className="rollup-staffing__name">{r.name}</span>
                      <span className="rollup-staffing__badge rollup-staffing__badge--warning">
                        {new Date(r.popEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · {r.daysRemaining}d
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

export function ExecutiveRollup() {
  const [windowOption, setWindowOption] = useState<WindowOption>('week');
  const [filterProgramId, setFilterProgramId] = useState('');
  const [filterProductId, setFilterProductId] = useState('');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [expandedPrograms, setExpandedPrograms] = useState<Set<string>>(new Set());
  const startRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLInputElement>(null);

  function applyCustomRange() {
    const start = startRef.current?.value ?? '';
    const end = endRef.current?.value ?? '';
    setCustomStart(start);
    setCustomEnd(end);
  }

  const queryParams =
    windowOption === 'custom'
      ? { window: 'custom', programId: filterProgramId || undefined, startDate: customStart || undefined, endDate: customEnd || undefined }
      : { window: windowOption, programId: filterProgramId || undefined };

  const { data, isLoading, isFetching } = useQuery<RollupData>({
    queryKey: ['rollup', queryParams],
    queryFn: () => statusAdminApi.rollup(queryParams),
    enabled: windowOption !== 'custom' || (!!customStart && !!customEnd),
  });

  const { data: programs = [] } = useQuery<Program[]>({
    queryKey: ['programs'],
    queryFn: programsApi.list,
  });

  const summary = data?.summary;
  const rawPrograms = data?.programs ?? [];
  const now = new Date();

  const allApplications = Array.from(
    new Map(
      rawPrograms
        .flatMap((prog) => prog.projects)
        .map((project) => project.application)
        .filter((application): application is Application => application != null)
        .map((application) => [application.id, application])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  const rollupPrograms = filterProductId
    ? rawPrograms
        .map((prog) => ({
          ...prog,
          projects: prog.projects.filter((p) => p.application?.id === filterProductId),
        }))
        .filter((prog) => prog.projects.length > 0)
    : rawPrograms;

  function toggleProgram(id: string) {
    setExpandedPrograms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (isLoading) {
    return <div className="page-loading"><span className="usa-spinner" aria-label="Loading" /> Loading...</div>;
  }


  return (
    <div className="usa-page">
      <div className="usa-page-header">
        <div>
          <h1 className="usa-page-title">
            Executive Summary
            {isFetching && !isLoading && (
              <span className="usa-spinner" aria-label="Refreshing" style={{ marginLeft: 10, width: 16, height: 16, verticalAlign: 'middle' }} />
            )}
          </h1>
          {summary && (
            <p className="usa-page-subtitle">
              {formatDate(summary.windowStart)} – {formatDate(summary.windowEnd)}
            </p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar" style={{ marginBottom: 'var(--space-3)' }}>
        <select
          className="usa-select"
          value={windowOption}
          onChange={(e) => setWindowOption(e.target.value as WindowOption)}
        >
          {(Object.entries(WINDOW_LABELS) as [WindowOption, string][]).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>

        {windowOption === 'custom' && (
          <>
            <input
              ref={startRef}
              type="date"
              className="usa-input"
              style={{ width: 160 }}
            />
            <span style={{ alignSelf: 'center', color: 'var(--usa-base-dark)', fontSize: 13 }}>to</span>
            <input
              ref={endRef}
              type="date"
              className="usa-input"
              style={{ width: 160 }}
            />
            <button className="usa-button" style={{ background: 'var(--usa-success)', color: '#fff' }} onClick={applyCustomRange}>
              Apply
            </button>
          </>
        )}

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
          value={filterProductId}
          onChange={(e) => setFilterProductId(e.target.value)}
        >
          <option value="">All Applications</option>
          {allApplications.map((application) => (
            <option key={application.id} value={application.id}>{application.name}</option>
          ))}
        </select>
      </div>

      {/* Custom range not ready */}
      {windowOption === 'custom' && (!customStart || !customEnd) && (
        <div className="empty-state">
          <div className="empty-state__icon"><Icon name="date_range" size={48} /></div>
          <h3>Select a date range</h3>
          <p>Choose a start and end date to generate the rollup.</p>
        </div>
      )}

      {/* Summary stat cards */}
      {summary && (
        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', marginBottom: 'var(--space-3)' }}>
          {summary.greenCount > 0 && (
            <div className="stat-card" style={{ borderTopColor: 'var(--usa-success)' }}>
              <div className="stat-card__value" style={{ color: 'var(--usa-success-dark)' }}>{summary.greenCount}</div>
              <div className="stat-card__label">On Track</div>
            </div>
          )}
          {summary.yellowCount > 0 && (
            <div className="stat-card" style={{ borderTopColor: 'var(--usa-warning-dark)' }}>
              <div className="stat-card__value" style={{ color: 'var(--usa-warning-darker)' }}>{summary.yellowCount}</div>
              <div className="stat-card__label">At Risk</div>
            </div>
          )}
          {summary.redCount > 0 && (
            <div className="stat-card" style={{ borderTopColor: 'var(--usa-error)' }}>
              <div className="stat-card__value" style={{ color: 'var(--usa-error)' }}>{summary.redCount}</div>
              <div className="stat-card__label">Off Track</div>
            </div>
          )}
          {summary.newAccomplishments > 0 && (
            <div className="stat-card" style={{ borderTopColor: 'var(--usa-primary)' }}>
              <div className="stat-card__value" style={{ color: 'var(--usa-primary)' }}>{summary.newAccomplishments}</div>
              <div className="stat-card__label">New Successes</div>
            </div>
          )}
          {summary.newUpdates > 0 && (
            <div className="stat-card">
              <div className="stat-card__value">{summary.newUpdates}</div>
              <div className="stat-card__label">New Updates</div>
            </div>
          )}
          {summary.openBlockers > 0 && (
            <div className="stat-card danger">
              <div className="stat-card__value danger">{summary.openBlockers}</div>
              <div className="stat-card__label">Open Blockers</div>
            </div>
          )}
          {summary.openRisks > 0 && (
            <div className="stat-card">
              <div className="stat-card__value">{summary.openRisks}</div>
              <div className="stat-card__label">Open Risks</div>
            </div>
          )}
          {summary.openIssues > 0 && (
            <div className="stat-card">
              <div className="stat-card__value">{summary.openIssues}</div>
              <div className="stat-card__label">Open Issues</div>
            </div>
          )}
          {(() => {
            const delinquent = rawPrograms.flatMap((prog) => prog.projects).filter((p) => p.updates.length === 0).length;
            return delinquent > 0 ? (
              <div className="stat-card" style={{ borderTopColor: '#e66a00' }}>
                <div className="stat-card__value" style={{ color: '#b84c00' }}>{delinquent}</div>
                <div className="stat-card__label">No Update</div>
              </div>
            ) : null;
          })()}
          {summary.resolvedCount > 0 && (
            <div className="stat-card" style={{ borderTopColor: 'var(--usa-success)' }}>
              <div className="stat-card__value" style={{ color: 'var(--usa-success-dark)' }}>{summary.resolvedCount}</div>
              <div className="stat-card__label">Resolved</div>
            </div>
          )}
          {summary.staffingOverAllocatedProjects > 0 && (
            <div className="stat-card" style={{ borderTopColor: 'var(--usa-warning-dark)' }}>
              <div className="stat-card__value" style={{ color: 'var(--usa-warning-darker)' }}>{summary.staffingOverAllocatedProjects}</div>
              <div className="stat-card__label">Over-Allocated</div>
            </div>
          )}
          {summary.staffingPopExpiringProjects > 0 && (
            <div className="stat-card" style={{ borderTopColor: 'var(--usa-warning)' }}>
              <div className="stat-card__value" style={{ color: 'var(--usa-warning-darker)' }}>{summary.staffingPopExpiringProjects}</div>
              <div className="stat-card__label">POP Expiring</div>
            </div>
          )}
        </div>
      )}

      {/* Needs Attention */}
      {rollupPrograms.length > 0 && (
        <NeedsAttentionSection items={buildAttentionItems(rollupPrograms, now)} />
      )}

      {/* Aggregated activity sections */}
      {rollupPrograms.length > 0 && (() => {
        const allAccomplishments = rollupPrograms.flatMap((prog) =>
          prog.projects.flatMap((p) =>
            p.accomplishments.map((a) => ({ ...a, projectName: p.name, projectId: p.id }))
          )
        ).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

        const allUpdates = rollupPrograms.flatMap((prog) =>
          prog.projects.flatMap((p) =>
            p.updates.map((u) => ({ ...u, projectName: p.name, projectId: p.id }))
          )
        ).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

        const allRisksIssues = rollupPrograms.flatMap((prog) =>
          prog.projects.flatMap((p) =>
            [...p.blockers, ...p.risks, ...p.issues].map((i) => ({ ...i, projectName: p.name, projectId: p.id }))
          )
        ).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

        const allResolved = rollupPrograms.flatMap((prog) =>
          prog.projects.flatMap((p) =>
            (p.resolvedIssues ?? []).map((i) => ({ ...i, projectName: p.name, projectId: p.id }))
          )
        ).sort((a, b) => (b.resolvedAt ?? b.createdAt).localeCompare(a.resolvedAt ?? a.createdAt));

        return (
          <div className="rollup-activity-sections">
            {allAccomplishments.length > 0 && (
              <Section title={`Successes (${allAccomplishments.length})`} color="var(--usa-success-dark)" icon="check_circle">
                {allAccomplishments.map((a) => (
                  <EntryRow key={a.id} text={a.text} date={a.createdAt} author={a.author?.displayName} project={a.projectName} projectId={a.projectId} />
                ))}
              </Section>
            )}

            {allUpdates.length > 0 && (
              <Section title={`Status Updates (${allUpdates.length})`} color="var(--usa-primary)" icon="update">
                {allUpdates.map((u) => (
                  <div key={u.id} className="rollup-update">
                    <div className="rollup-update__meta">
                      <RagBadge status={u.overallStatus} />
                      <Link to={`/status/projects/${u.projectId}`} className="rollup-entry__project-link">{u.projectName}</Link>
                      <span className="rollup-entry__meta">
                        {formatDate(u.createdAt)}{u.author ? ` · ${u.author.displayName}` : ''}
                      </span>
                    </div>
                    <p className="rollup-update__summary">{u.summary}</p>
                    {u.risks && (
                      <p className="rollup-update__sub rollup-update__sub--warning">
                        <strong>Risks:</strong> {u.risks}
                      </p>
                    )}
                    {u.blockers && (
                      <p className="rollup-update__sub rollup-update__sub--error">
                        <strong>Blockers:</strong> {u.blockers}
                      </p>
                    )}
                  </div>
                ))}
              </Section>
            )}

            {allRisksIssues.length > 0 && (
              <Section title={`Risks & Issues (${allRisksIssues.length})`} color="var(--usa-warning-darker)" icon="warning">
                {allRisksIssues.map((i) => (
                  <EntryRow key={i.id} text={i.text} date={i.createdAt} author={i.author?.displayName} project={i.projectName} projectId={i.projectId} category={i.category} />
                ))}
              </Section>
            )}

            {allResolved.length > 0 && (
              <Section title={`Recently Resolved (${allResolved.length})`} color="var(--usa-success-dark)" icon="check_circle">
                {allResolved.map((i) => (
                  <div key={i.id} className="rollup-entry" style={{ opacity: 0.8 }}>
                    <span className="rollup-entry__text">
                      <CategoryBadge category={i.category} />
                      {' '}<span style={{ textDecoration: 'line-through' }}>{i.text}</span>
                      {i.resolutionNotes && (
                        <span style={{ fontStyle: 'italic', color: 'var(--usa-success-darker)', marginLeft: 8 }}>
                          — {i.resolutionNotes}
                        </span>
                      )}
                    </span>
                    <span className="rollup-entry__meta">
                      {i.projectId ? (
                        <Link to={`/status/projects/${i.projectId}`} className="rollup-entry__project-link">{i.projectName}</Link>
                      ) : (
                        <span className="rollup-entry__project">{i.projectName}</span>
                      )}
                      {i.resolvedAt && formatDate(i.resolvedAt)}{i.resolvedBy ? ` · ${i.resolvedBy.displayName}` : ''}
                    </span>
                  </div>
                ))}
              </Section>
            )}
          </div>
        );
      })()}

      {/* Programs */}
      {rollupPrograms.length === 0 && windowOption !== 'custom' && (
        <div className="empty-state">
          <div className="empty-state__icon"><Icon name="summarize" size={48} /></div>
          <h3>No projects found</h3>
          <p>No active projects match the selected filters.</p>
        </div>
      )}

      {rollupPrograms.map((prog) => {
        const isCollapsed = !expandedPrograms.has(prog.id);
        const programAccomplishments = prog.projects.reduce((n, p) => n + p.accomplishments.length, 0);
        const programBlockers = prog.projects.reduce((n, p) => n + p.blockers.length, 0);
        const programRisks = prog.projects.reduce((n, p) => n + p.risks.length, 0);
        const delinquentCount = prog.projects.filter((p) => p.updates.length === 0).length;
        const trends = prog.projects.map((p) => getTrend(p.status, p.previousStatus)).filter(Boolean) as TrendDirection[];
        const improving = trends.filter((t) => t === 'improving').length;
        const degrading = trends.filter((t) => t === 'degrading').length;
        const greenCount = prog.projects.filter((p) => p.status === 'green').length;
        const yellowCount = prog.projects.filter((p) => p.status === 'yellow').length;
        const redCount = prog.projects.filter((p) => p.status === 'red').length;

        return (
          <div key={prog.id} className="rollup-program">
            <button className="rollup-program__header" onClick={() => toggleProgram(prog.id)}>
              <Icon name={isCollapsed ? 'chevron_right' : 'expand_more'} color="#fff" size={18} />
              <span className="rollup-program__name">{prog.name}</span>
              <span className="rollup-program__rag-pills">
                {greenCount > 0 && <span className="rollup-program__rag-pill rollup-program__rag-pill--green">{greenCount}</span>}
                {yellowCount > 0 && <span className="rollup-program__rag-pill rollup-program__rag-pill--yellow">{yellowCount}</span>}
                {redCount > 0 && <span className="rollup-program__rag-pill rollup-program__rag-pill--red">{redCount}</span>}
              </span>
              <span className="rollup-program__meta">
                {prog.projects.length} project{prog.projects.length !== 1 ? 's' : ''}
                {improving > 0 && (
                  <span className="rollup-trend-count rollup-trend-count--improving"> · ↑ {improving}</span>
                )}
                {degrading > 0 && (
                  <span className="rollup-trend-count rollup-trend-count--degrading"> · ↓ {degrading}</span>
                )}
                {delinquentCount > 0 && (
                  <span className="rollup-trend-count rollup-trend-count--delinquent"> · ⏱ {delinquentCount} no update{delinquentCount !== 1 ? 's' : ''}</span>
                )}
                {programAccomplishments > 0 && ` · ✓ ${programAccomplishments}`}
                {programBlockers > 0 && ` · ⊘ ${programBlockers} blocker${programBlockers !== 1 ? 's' : ''}`}
                {programRisks > 0 && ` · ⚠ ${programRisks} risk${programRisks !== 1 ? 's' : ''}`}
              </span>
            </button>

            {!isCollapsed && (
              <div className="rollup-program__projects">
                {prog.projects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
