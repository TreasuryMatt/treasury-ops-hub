import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { risksApi } from '../../api/risks';
import { programsApi } from '../../api/programs';
import { statusProjectsApi } from '../../api/statusProjects';
import { adminApi } from '../../api/admin';
import { useAuth } from '../../context/AuthContext';
import { Icon } from '../../components/Icon';
import { Program, Risk, RiskCategory, RiskCriticality, RiskProgress, StatusProject } from '../../types';
import { RISK_CRITICALITY_LABELS, RISK_CRITICALITY_STYLES, RISK_PROGRESS_LABELS, RISK_PROGRESS_STYLES } from './riskUi';

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
      }}
    >
      {children}
    </span>
  );
}

type SortColumn = 'riskCode' | 'title' | 'program' | 'project' | 'category' | 'progress' | 'criticality' | 'dateIdentified';

export function Risks() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canCreate = !!user;
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

  function SortTh({ col, label }: { col: SortColumn; label: string }) {
    const active = sort.col === col;
    return (
      <th onClick={() => handleSort(col)} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {label}
          <Icon
            name={active ? (sort.dir === 'asc' ? 'arrow_up' : 'arrow_down') : 'arrow_updown'}
            size={14}
            color={active ? 'var(--usa-primary)' : 'var(--usa-base)'}
          />
        </span>
      </th>
    );
  }

  if (isLoading) {
    return <div className="page-loading"><span className="usa-spinner" aria-label="Loading" /> Loading...</div>;
  }

  return (
    <div className="usa-page">
      <div className="usa-page-header">
        <div>
          <h1 className="usa-page-title">Risks</h1>
          <p className="usa-page-subtitle">{risks.length} risk{risks.length !== 1 ? 's' : ''} tracked across the portfolio</p>
        </div>
        {canCreate && (
          <button className="usa-button usa-button--outline usa-button--sm" onClick={() => navigate('/risks/risks/new')}>
            <Icon name="add" size={16} /> Create Risk
          </button>
        )}
      </div>

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
      </div>

      {risks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon"><Icon name="warning" size={48} /></div>
          <h3>No risks found</h3>
          <p>{canCreate ? 'Create the first risk to begin tracking it here.' : 'No risks match the current filters.'}</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="usa-table">
            <thead>
              <tr>
                <SortTh col="riskCode" label="ID" />
                <SortTh col="title" label="Title" />
                <SortTh col="program" label="Program" />
                <SortTh col="project" label="Project" />
                <SortTh col="category" label="Category" />
                <SortTh col="criticality" label="Criticality" />
                <SortTh col="progress" label="Progress" />
                <SortTh col="dateIdentified" label="Date Identified" />
                <th>Owner</th>
                <th>Comments</th>
              </tr>
            </thead>
            <tbody>
              {risks.map((risk) => (
                <tr key={risk.id} onClick={() => navigate(`/risks/risks/${risk.id}`)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 700 }}>{risk.riskCode}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{risk.title}</div>
                    {risk.spmId && <div style={{ fontSize: 12, color: 'var(--usa-base-dark)' }}>SPM: {risk.spmId}</div>}
                  </td>
                  <td>{risk.program?.name || '—'}</td>
                  <td>{risk.statusProject?.name || '—'}</td>
                  <td>{risk.category?.name || '—'}</td>
                  <td>
                    <Pill {...RISK_CRITICALITY_STYLES[risk.criticality]}>
                      {RISK_CRITICALITY_LABELS[risk.criticality]}
                    </Pill>
                  </td>
                  <td>
                    <Pill {...RISK_PROGRESS_STYLES[risk.progress]}>
                      {RISK_PROGRESS_LABELS[risk.progress]}
                    </Pill>
                  </td>
                  <td>{risk.dateIdentified ? new Date(risk.dateIdentified).toLocaleDateString() : '—'}</td>
                  <td>{risk.program?.federalOwner || '—'}</td>
                  <td>{risk._count?.comments ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
