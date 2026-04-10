import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { statusProjectsApi } from '../../api/statusProjects';
import { statusAdminApi } from '../../api/statusAdmin';
import { programsApi } from '../../api/programs';
import { useAuth } from '../../context/AuthContext';
import { StatusProject, Program, StatusTrendPoint } from '../../types';
import { Icon } from '../../components/Icon';
import { RagBadge } from '../../components/RagBadge';
import { RagSparkline } from '../../components/RagSparkline';

export function StatusProjects() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const canEdit = user?.role === 'editor' || user?.role === 'admin';

  const [filters, setFilters] = useState({
    programId: searchParams.get('programId') || '',
    status: searchParams.get('status') || '',
    search: '',
  });
  const [filterProductId, setFilterProductId] = useState('');

  const { data: projects = [], isLoading } = useQuery<StatusProject[]>({
    queryKey: ['status-projects', filters],
    queryFn: () => statusProjectsApi.list(filters),
  });
  const { data: programs = [] } = useQuery<Program[]>({
    queryKey: ['programs'],
    queryFn: programsApi.list,
  });
  const { data: trends = {} } = useQuery<Record<string, StatusTrendPoint[]>>({
    queryKey: ['status-trends'],
    queryFn: statusAdminApi.trends,
  });

  const allProducts = Array.from(
    new Map(
      projects
        .flatMap((p) => p.products ?? [])
        .map((pp) => pp.product)
        .filter(Boolean)
        .map((prod) => [prod!.id, prod!])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  const visibleProjects = filterProductId
    ? projects.filter((p) => p.products?.some((pp) => pp.product?.id === filterProductId))
    : projects;

  if (isLoading) {
    return <div className="page-loading"><span className="usa-spinner" aria-label="Loading" /> Loading...</div>;
  }

  return (
    <div className="usa-page">
      <div className="usa-page-header">
        <div>
          <h1 className="usa-page-title">Projects</h1>
          <p className="usa-page-subtitle">{visibleProjects.length} project{visibleProjects.length !== 1 ? 's' : ''}</p>
        </div>
        {canEdit && (
          <button className="usa-button usa-button--outline usa-button--sm" onClick={() => navigate('/status/projects/new')}>
            + New Project
          </button>
        )}
      </div>

      <div className="filter-bar">
        <div className="filter-bar__search">
          <Icon name="search" color="var(--usa-base)" />
          <input
            className="usa-input"
            placeholder="Search projects..."
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
        </div>
        <select
          className="usa-select"
          value={filters.programId}
          onChange={(e) => setFilters((f) => ({ ...f, programId: e.target.value }))}
        >
          <option value="">All Programs</option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          className="usa-select"
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
        >
          <option value="">All Statuses</option>
          <option value="green">On Track</option>
          <option value="yellow">At Risk</option>
          <option value="red">Off Track</option>
          <option value="gray">Not Started</option>
          <option value="overdue">Overdue Updates</option>
        </select>
        <select
          className="usa-select"
          value={filterProductId}
          onChange={(e) => setFilterProductId(e.target.value)}
        >
          <option value="">All Applications</option>
          {allProducts.map((prod) => (
            <option key={prod.id} value={prod.id}>{prod.name}</option>
          ))}
        </select>
      </div>

      {visibleProjects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon"><Icon name="folder_open" size={48} /></div>
          <h3>No projects found</h3>
          <p>{canEdit ? 'Create a project to get started.' : 'No projects match the current filters.'}</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="usa-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Trend</th>
                <th>Project</th>
                <th>Program</th>
                <th>Phase</th>
                <th>Applications</th>
                <th>Federal Product Owner</th>
                <th>Next Update Due</th>
              </tr>
            </thead>
            <tbody>
              {visibleProjects.map((sp) => (
                <tr key={sp.id} onClick={() => navigate(`/status/projects/${sp.id}`)} style={{ cursor: 'pointer' }}>
                  <td><RagBadge status={sp.status} /></td>
                  <td><RagSparkline points={trends[sp.id] || []} /></td>
                  <td style={{ fontWeight: 600 }}>{sp.name}</td>
                  <td>{sp.program?.name || '—'}</td>
                  <td>{sp.phase || '—'}</td>
                  <td>
                    {sp.products && sp.products.length > 0 ? (
                      <div className="app-pills">
                        {sp.products.map((pp) => pp.product && (
                          <span key={pp.id} className="app-pill">{pp.product.name}</span>
                        ))}
                      </div>
                    ) : '—'}
                  </td>
                  <td>{sp.federalProductOwner || '—'}</td>
                  <td>
                    {sp.nextUpdateDue ? (
                      <span style={{ color: new Date(sp.nextUpdateDue) < new Date() ? 'var(--usa-error)' : undefined }}>
                        {new Date(sp.nextUpdateDue).toLocaleDateString()}
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
