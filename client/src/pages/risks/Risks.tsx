import React, { useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { risksApi } from '../../api/risks';
import { programsApi } from '../../api/programs';
import { statusProjectsApi } from '../../api/statusProjects';
import { adminApi } from '../../api/admin';
import { useAuth } from '../../context/AuthContext';
import { Icon } from '../../components/Icon';
import { Program, Risk, RiskCategory, RiskCriticality, RiskProgress, RisksDashboardStats, StatusProject } from '../../types';
import { RISK_CRITICALITY_LABELS, RISK_CRITICALITY_STYLES, RISK_PROGRESS_LABELS, RISK_PROGRESS_STYLES, RISK_STATUS_LABELS, RISK_STATUS_STYLES, computeRiskStatus } from './riskUi';

function Pill({ children, bg, color }: { children: React.ReactNode; bg: string; color: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 999,
        backgroundColor: bg,
        color,
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

type SortColumn = 'riskCode' | 'title' | 'program' | 'project' | 'impactDate' | 'progress' | 'dateIdentified';

function SortTh({ col, label, sort, onSort }: { col: SortColumn; label: string; sort: { col: SortColumn; dir: 'asc' | 'desc' }; onSort: (col: SortColumn) => void }) {
  const active = sort.col === col;
  return (
    <th onClick={() => onSort(col)} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {label}
        <Icon
          name={active ? (sort.dir === 'asc' ? 'arrow_up' : 'arrow_down') : 'arrow_updown'}
          size={14}
          color={active ? '#fff' : 'rgba(255,255,255,0.5)'}
        />
      </span>
    </th>
  );
}

export function Risks() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const tableRef = useRef<HTMLDivElement>(null);
  const canCreate = !!user;
  const [showNoMitigationModal, setShowNoMitigationModal] = useState(false);
  const [sort, setSort] = useState<{ col: SortColumn; dir: 'asc' | 'desc' }>({ col: 'dateIdentified', dir: 'desc' });
  const [filters, setFilters] = useState({
    search: '',
    programId: '',
    projectId: '',
    categoryId: '',
    progress: '',
    criticality: '',
  });

  const queryParams = useMemo(
    () => ({
      ...(filters.search ? { search: filters.search } : {}),
      ...(filters.programId ? { programId: filters.programId } : {}),
      ...(filters.projectId ? { projectId: filters.projectId } : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.progress ? { progress: filters.progress } : {}),
      ...(filters.criticality ? { criticality: filters.criticality } : {}),
      sortBy: sort.col,
      sortDir: sort.dir,
    }),
    [filters, sort]
  );

  const { data: risks = [], isLoading } = useQuery<Risk[]>({
    queryKey: ['risks', queryParams],
    queryFn: () => risksApi.list(queryParams),
  });
  const { data: stats } = useQuery<RisksDashboardStats>({
    queryKey: ['risks-dashboard'],
    queryFn: risksApi.dashboard,
  });
  const { data: programs = [] } = useQuery<Program[]>({
    queryKey: ['programs'],
    queryFn: programsApi.list,
  });
  const { data: projects = [] } = useQuery<StatusProject[]>({
    queryKey: ['status-projects', 'all-risks'],
    queryFn: () => statusProjectsApi.list({}),
  });
  const { data: categories = [] } = useQuery<RiskCategory[]>({
    queryKey: ['risk-categories'],
    queryFn: adminApi.riskCategories,
  });

  const visibleProjects = filters.programId
    ? projects.filter((project) => project.programId === filters.programId)
    : projects;

  function handleSort(col: SortColumn) {
    setSort((prev) => (prev.col === col ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' }));
  }

  if (isLoading) {
    return <div className="page-loading"><span className="usa-spinner" aria-label="Loading" /> Loading...</div>;
  }

  return (
    <div className="usa-page">
      <div className="usa-page-header">
        <div>
          <h1 className="usa-page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="shield" color="#c9a227" size={26} />
            Risks
          </h1>
          <p className="usa-page-subtitle">{risks.length} risk{risks.length !== 1 ? 's' : ''} tracked across the portfolio</p>
        </div>
        {canCreate && (
          <button className="usa-button usa-button--outline usa-button--sm" onClick={() => navigate('/risks/risks/new')}>
            <Icon name="add" size={16} /> Create Risk
          </button>
        )}
      </div>

      {/* Progress mini cards */}
      {stats && (
        <>
          <div className="dashboard-quick-stats">
            <button className="dashboard-quick-stat" onClick={() => setFilters((f) => ({ ...f, progress: '' }))}>
              <div className="dashboard-quick-stat__label">Total Risks</div>
              <div className="dashboard-quick-stat__value">{stats.totalRisks}</div>
            </button>
            <button
              className="dashboard-quick-stat"
              style={{ borderLeftColor: RISK_PROGRESS_STYLES.open.bg }}
              onClick={() => setFilters((f) => ({ ...f, progress: 'open' }))}
            >
              <div className="dashboard-quick-stat__label">Open</div>
              <div className="dashboard-quick-stat__value">{stats.byProgress.open}</div>
            </button>
            <button
              className="dashboard-quick-stat"
              onClick={() => setFilters((f) => ({ ...f, progress: 'assumed' }))}
            >
              <div className="dashboard-quick-stat__label">Assumed</div>
              <div className="dashboard-quick-stat__value">{stats.byProgress.assumed}</div>
            </button>
            <button
              className="dashboard-quick-stat"
              style={{ borderLeftColor: RISK_PROGRESS_STYLES.mitigated.bg }}
              onClick={() => setFilters((f) => ({ ...f, progress: 'mitigated' }))}
            >
              <div className="dashboard-quick-stat__label">Mitigated</div>
              <div className="dashboard-quick-stat__value">{stats.byProgress.mitigated}</div>
            </button>
            <button
              className={`dashboard-quick-stat${stats.byProgress.escalated_to_issue > 0 ? ' dashboard-quick-stat--danger' : ''}`}
              onClick={() => setFilters((f) => ({ ...f, progress: 'escalated_to_issue' }))}
            >
              <div className="dashboard-quick-stat__label">Converted to Issue</div>
              <div className="dashboard-quick-stat__value">{stats.byProgress.escalated_to_issue}</div>
            </button>
          </div>

          {/* Action cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)', margin: 'var(--space-3) 0' }}>
            <div className={`dashboard-action-card dashboard-action-card--${stats.impactingSoon > 0 ? 'danger' : 'success'}`}>
              <div className="dashboard-action-card__eyebrow">Suggested Focus</div>
              <div className="dashboard-action-card__metric">{stats.impactingSoon} Impacting Soon</div>
              <p className="dashboard-action-card__detail">
                This is the number of open risks whose Impact Date is approaching in the next 14 days.
              </p>
              <button className="usa-button usa-button--outline" onClick={() => {
                setFilters((f) => ({ ...f, progress: 'open' }));
                setSort({ col: 'impactDate', dir: 'asc' });
                setTimeout(() => tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
              }}>
                Sort by Impact Date
              </button>
            </div>
            <div className="dashboard-action-card" style={{ borderLeftColor: '#1b1b1b' }}>
              <div className="dashboard-action-card__eyebrow">Suggested Focus</div>
              <div className="dashboard-action-card__metric">{stats.byCriticality.critical} Critical Risks</div>
              <p className="dashboard-action-card__detail">
                This is the number of open risks currently rated Critical — the highest severity level.
              </p>
              <button className="usa-button usa-button--outline" onClick={() => {
                setFilters((f) => ({ ...f, criticality: 'critical' }));
                setSort({ col: 'impactDate', dir: 'asc' });
                setTimeout(() => tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
              }}>
                View Critical Risks
              </button>
            </div>
            <div className={`dashboard-action-card dashboard-action-card--${stats.withoutMitigationPlan > 0 ? 'warning' : 'success'}`}>
              <div className="dashboard-action-card__eyebrow">Suggested Focus</div>
              <div className="dashboard-action-card__metric">{stats.withoutMitigationPlan} Without a Mitigation Plan</div>
              <p className="dashboard-action-card__detail">
                This is the number of open risks that have no mitigation action steps recorded yet.
              </p>
              <button className="usa-button usa-button--outline" onClick={() => setShowNoMitigationModal(true)}>
                View These Risks
              </button>
            </div>
          </div>


          {/* By program cards */}
          {stats.byProgram.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              {stats.byProgram.map((prog) => (
                <div
                  key={prog.id}
                  className="detail-card"
                  style={{ cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                  onClick={() => setFilters((f) => ({ ...f, programId: prog.id, projectId: '' }))}
                  onMouseEnter={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow-2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow-1)')}
                >
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--usa-primary-dark)', marginBottom: 6 }}>
                    {prog.name}
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-3)', fontSize: 13 }}>
                    <span><strong>{prog.totalCount}</strong> total</span>
                    {prog.openCount > 0 && (
                      <span style={{ color: 'var(--usa-primary)' }}><strong>{prog.openCount}</strong> open</span>
                    )}
                    {prog.criticalCount > 0 && (
                      <span style={{ color: 'var(--usa-error)' }}><strong>{prog.criticalCount}</strong> critical</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className="filter-bar">
        <div className="filter-bar__search">
          <Icon name="search" color="var(--usa-base)" />
          <input
            className="usa-input"
            placeholder="Search by ID, title, statement, or SPM ID"
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
          />
        </div>
        <select
          className="usa-select"
          value={filters.programId}
          onChange={(e) => setFilters((prev) => ({ ...prev, programId: e.target.value, projectId: '' }))}
        >
          <option value="">All Programs</option>
          {programs.map((program) => (
            <option key={program.id} value={program.id}>{program.name}</option>
          ))}
        </select>
        <select
          className="usa-select"
          value={filters.projectId}
          onChange={(e) => setFilters((prev) => ({ ...prev, projectId: e.target.value }))}
        >
          <option value="">All Projects</option>
          {visibleProjects.map((project) => (
            <option key={project.id} value={project.id}>{project.name}</option>
          ))}
        </select>
        <select
          className="usa-select"
          value={filters.categoryId}
          onChange={(e) => setFilters((prev) => ({ ...prev, categoryId: e.target.value }))}
        >
          <option value="">All Categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
        <select
          className="usa-select"
          value={filters.progress}
          onChange={(e) => setFilters((prev) => ({ ...prev, progress: e.target.value }))}
        >
          <option value="">All Progress</option>
          {(Object.keys(RISK_PROGRESS_LABELS) as RiskProgress[]).map((progress) => (
            <option key={progress} value={progress}>{RISK_PROGRESS_LABELS[progress]}</option>
          ))}
        </select>
        <select
          className="usa-select"
          value={filters.criticality}
          onChange={(e) => setFilters((prev) => ({ ...prev, criticality: e.target.value }))}
        >
          <option value="">All Criticality</option>
          {(Object.keys(RISK_CRITICALITY_LABELS) as RiskCriticality[]).map((criticality) => (
            <option key={criticality} value={criticality}>{RISK_CRITICALITY_LABELS[criticality]}</option>
          ))}
        </select>
        {(filters.search || filters.programId || filters.projectId || filters.categoryId || filters.progress || filters.criticality) && (
          <button
            className="usa-button usa-button--unstyled"
            style={{ fontSize: 13, color: 'var(--usa-base-dark)', whiteSpace: 'nowrap' }}
            onClick={() => setFilters({ search: '', programId: '', projectId: '', categoryId: '', progress: '', criticality: '' })}
          >
            Clear filters
          </button>
        )}
      </div>

      {risks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon"><Icon name="warning" size={48} /></div>
          <h3>No risks found</h3>
          <p>{canCreate ? 'Create the first risk to begin tracking it here.' : 'No risks match the current filters.'}</p>
        </div>
      ) : (
        <div className="table-wrap" ref={tableRef}>
          <table className="usa-table">
            <thead>
              <tr>
                <th style={{ width: 5, padding: 0 }} aria-label="Criticality" />
                <SortTh col="title" label="Title" sort={sort} onSort={handleSort} />
                <SortTh col="program" label="Program" sort={sort} onSort={handleSort} />
                <SortTh col="project" label="Project" sort={sort} onSort={handleSort} />
                <th>Status</th>
                <SortTh col="impactDate" label="Impact Date" sort={sort} onSort={handleSort} />
                <SortTh col="progress" label="Progress" sort={sort} onSort={handleSort} />
                <SortTh col="dateIdentified" label="Date Identified" sort={sort} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {risks.map((risk) => (
                <tr key={risk.id} onClick={() => navigate(`/risks/risks/${risk.id}`)} style={{ cursor: 'pointer' }}>
                  <td
                    style={{ width: 5, padding: 0, backgroundColor: RISK_CRITICALITY_STYLES[risk.criticality].bg }}
                    title={RISK_CRITICALITY_LABELS[risk.criticality]}
                  />
                  <td>
                    <div style={{ fontWeight: 600 }}>{risk.title}</div>
                    {risk.spmId && <div style={{ fontSize: 12, color: 'var(--usa-base-dark)' }}>SPM: {risk.spmId}</div>}
                  </td>
                  <td>{risk.program?.name || '—'}</td>
                  <td>{risk.statusProject?.name || '—'}</td>
                  <td>
                    {(() => {
                      const s = computeRiskStatus((risk.mitigationActions ?? []) as { status: any }[]);
                      return <Pill {...RISK_STATUS_STYLES[s]}>{RISK_STATUS_LABELS[s]}</Pill>;
                    })()}
                  </td>
                  <td>{risk.impactDate ? new Date(risk.impactDate).toLocaleDateString() : '—'}</td>
                  <td>
                    <Pill {...RISK_PROGRESS_STYLES[risk.progress]}>
                      {RISK_PROGRESS_LABELS[risk.progress]}
                    </Pill>
                  </td>
                  <td>{risk.dateIdentified ? new Date(risk.dateIdentified).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Without Mitigation Plan Modal ── */}
      {showNoMitigationModal && (() => {
        const unplanned = risks.filter((r) => !r.mitigationActions || r.mitigationActions.length === 0);
        return (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setShowNoMitigationModal(false)}
          >
            <div
              style={{ background: 'var(--usa-page-bg, #fff)', borderRadius: 10, width: '90%', maxWidth: 680, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-3)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--usa-base-lighter)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ margin: 0, fontSize: 18 }}>Risks Without a Mitigation Plan</h2>
                <button className="usa-button usa-button--unstyled" onClick={() => setShowNoMitigationModal(false)} style={{ fontSize: 20, lineHeight: 1 }}>✕</button>
              </div>
              <div style={{ overflowY: 'auto', flex: 1, padding: '16px 24px' }}>
                {unplanned.length === 0 ? (
                  <p style={{ color: 'var(--usa-success-dark)', fontWeight: 600 }}>All open risks have at least one mitigation action step. Great work!</p>
                ) : (
                  <table className="usa-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Program</th>
                        <th>Criticality</th>
                        <th>Date Identified</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unplanned.map((r) => (
                        <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => { setShowNoMitigationModal(false); navigate(`/risks/risks/${r.id}`); }}>
                          <td style={{ fontWeight: 600 }}>{r.title}</td>
                          <td>{r.program?.name || '—'}</td>
                          <td>
                            <Pill {...RISK_CRITICALITY_STYLES[r.criticality]}>{RISK_CRITICALITY_LABELS[r.criticality]}</Pill>
                          </td>
                          <td>{r.dateIdentified ? new Date(r.dateIdentified).toLocaleDateString() : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
