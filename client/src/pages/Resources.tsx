import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { resourcesApi } from '../api/resources';
import { adminApi } from '../api/admin';
import { useAuth } from '../context/AuthContext';
import { Icon } from '../components/Icon';
import { SortIcon, SortDir } from '../components/SortIcon';
import { formatDivision } from '../utils/format';

type SortField = 'lastName' | 'firstName' | 'division' | 'functionalArea' | 'primaryRole' | 'resourceType' | 'supervisor' | 'totalPercentUtilized' | 'availableCapacity';

export function Resources() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const canDelete = user?.role === 'admin';
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const deleteResource = useMutation({
    mutationFn: (id: string) => resourcesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resources'] });
      setConfirmDelete(null);
    },
  });

  const [search, setSearch] = useState('');
  const [division, setDivision] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [roleId, setRoleId] = useState('');
  const [functionalAreaId, setFunctionalAreaId] = useState('');
  const sortBy = (searchParams.get('sortBy') as SortField) || 'lastName';
  const sortDir = (searchParams.get('sortDir') as SortDir) || 'asc';
  const [page, setPage] = useState(1);

  const params: Record<string, string> = { page: String(page), limit: '50', sortBy, sortDir };
  if (search) params.search = search;
  if (division) params.division = division;
  if (resourceType) params.resourceType = resourceType;
  if (roleId) params.roleId = roleId;
  if (functionalAreaId) params.functionalAreaId = functionalAreaId;

  const { data, isLoading } = useQuery({
    queryKey: ['resources', params],
    queryFn: () => resourcesApi.list(params),
  });

  const { data: roles } = useQuery({ queryKey: ['roles'], queryFn: () => adminApi.roles() });
  const { data: funcAreas } = useQuery({ queryKey: ['functional-areas'], queryFn: () => adminApi.functionalAreas() });

  // Filter functional areas by selected division
  const filteredFuncAreas = funcAreas?.filter((fa: any) => !division || fa.division === division) ?? [];

  function handleSort(field: SortField) {
    const newDir = sortBy === field && sortDir === 'asc' ? 'desc' : 'asc';
    setSearchParams({ sortBy: field, sortDir: newDir });
    setPage(1);
  }

  function handleDivisionChange(val: string) {
    setDivision(val);
    setFunctionalAreaId(''); // reset FA when division changes
    setPage(1);
  }

  const utilizationColor = (pct: number) => {
    if (pct > 1) return 'var(--usa-error)';
    if (pct >= 0.8) return 'var(--usa-success)';
    if (pct >= 0.5) return 'var(--usa-warning-dark)';
    return 'var(--usa-error)';
  };

  const thStyle: React.CSSProperties = { cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' };

  return (
    <div className="usa-page">
      <div className="usa-page-header">
        <h1 className="usa-page-title">Resources</h1>
        <p className="usa-page-subtitle">{data?.meta.total ?? '...'} total resources</p>
      </div>

      <div className="filter-bar">
        <div className="filter-bar__search">
          <Icon name="search" color="var(--usa-base)" />
          <input
            className="usa-input"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className="usa-select" value={division} onChange={(e) => handleDivisionChange(e.target.value)}>
          <option value="">All Divisions</option>
          <option value="operations">Operations</option>
          <option value="engineering">Engineering</option>
          <option value="pmso">PMSO</option>
        </select>
        <select
          className="usa-select"
          value={functionalAreaId}
          onChange={(e) => { setFunctionalAreaId(e.target.value); setPage(1); }}
        >
          <option value="">All Functional Areas</option>
          {filteredFuncAreas.map((fa: any) => (
            <option key={fa.id} value={fa.id}>{fa.name}</option>
          ))}
        </select>
        <select className="usa-select" value={resourceType} onChange={(e) => { setResourceType(e.target.value); setPage(1); }}>
          <option value="">All Types</option>
          <option value="federal">Federal</option>
          <option value="contractor">Contractor</option>
        </select>
        <select className="usa-select" value={roleId} onChange={(e) => { setRoleId(e.target.value); setPage(1); }}>
          <option value="">All Roles</option>
          {roles?.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        {(user?.role === 'editor' || user?.role === 'manager' || user?.role === 'admin') && (
          <button className="usa-button usa-button--primary" onClick={() => navigate('/staffing/resources/new')}>
            <Icon name="add" color="white" /> Add Resource
          </button>
        )}
      </div>

      {isLoading ? (
        <span className="usa-spinner" aria-label="Loading" />
      ) : (
        <>
          <table className="usa-table">
            <thead>
              <tr>
                <th style={thStyle} onClick={() => handleSort('lastName')}>
                  Name <SortIcon field="lastName" active={sortBy === 'lastName'} dir={sortDir} />
                </th>
                <th style={thStyle} onClick={() => handleSort('resourceType')}>
                  Type <SortIcon field="resourceType" active={sortBy === 'resourceType'} dir={sortDir} />
                </th>
                <th style={thStyle} onClick={() => handleSort('division')}>
                  Division <SortIcon field="division" active={sortBy === 'division'} dir={sortDir} />
                </th>
                <th style={thStyle} onClick={() => handleSort('functionalArea')}>
                  Functional Area <SortIcon field="functionalArea" active={sortBy === 'functionalArea'} dir={sortDir} />
                </th>
                <th style={thStyle} onClick={() => handleSort('primaryRole')}>
                  Primary Role <SortIcon field="primaryRole" active={sortBy === 'primaryRole'} dir={sortDir} />
                </th>
                <th style={thStyle} onClick={() => handleSort('supervisor')}>
                  Supervisor <SortIcon field="supervisor" active={sortBy === 'supervisor'} dir={sortDir} />
                </th>
                <th style={thStyle} onClick={() => handleSort('totalPercentUtilized')}>
                  Utilization <SortIcon field="totalPercentUtilized" active={sortBy === 'totalPercentUtilized'} dir={sortDir} />
                </th>
                <th style={thStyle} onClick={() => handleSort('availableCapacity')}>
                  Available <SortIcon field="availableCapacity" active={sortBy === 'availableCapacity'} dir={sortDir} />
                </th>
                {canDelete && <th style={{ ...thStyle, width: 48 }} />}
              </tr>
            </thead>
            <tbody>
              {data?.data.map((r) => (
                <tr key={r.id} onClick={() => navigate(`/staffing/resources/${r.id}`)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 600 }}>{r.lastName}, {r.firstName}</td>
                  <td>
                    <span className={`badge badge--${r.resourceType}`}>
                      {r.resourceType === 'federal' ? 'FED' : 'CTR'}
                    </span>
                  </td>
                  <td>{formatDivision(r.division)}</td>
                  <td>{r.functionalArea?.name || '-'}</td>
                  <td>{r.primaryRole?.name || '-'}</td>
                  <td>{r.supervisor ? `${r.supervisor.lastName}, ${r.supervisor.firstName}` : '-'}</td>
                  <td>
                    <span style={{ color: utilizationColor(r.totalPercentUtilized), fontWeight: 600 }}>
                      {Math.round(r.totalPercentUtilized * 100)}%
                    </span>
                  </td>
                  <td>
                    <span style={{ color: r.availableCapacity > 0 ? 'var(--usa-success)' : 'var(--usa-error)' }}>
                      {Math.round(r.availableCapacity * 100)}%
                    </span>
                  </td>
                  {canDelete && (
                    <td onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
                      <button
                        className="usa-button usa-button--unstyled"
                        title="Deactivate resource"
                        onClick={() => setConfirmDelete({ id: r.id, name: `${r.lastName}, ${r.firstName}` })}
                      >
                        <Icon name="delete" size={16} color="var(--usa-error)" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {data?.data.length === 0 && (
                <tr><td colSpan={canDelete ? 9 : 8} style={{ textAlign: 'center', padding: 32 }}>No resources found.</td></tr>
              )}
            </tbody>
          </table>

          {data && data.meta.pages > 1 && (
            <div className="pagination">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="usa-button usa-button--outline">Previous</button>
              <span>Page {page} of {data.meta.pages}</span>
              <button disabled={page >= data.meta.pages} onClick={() => setPage(page + 1)} className="usa-button usa-button--outline">Next</button>
            </div>
          )}
        </>
      )}

      {confirmDelete && (
        <div className="modal-overlay">
          <div className="modal">
            <h2 className="modal-title">Deactivate Resource</h2>
            <p>Are you sure you want to deactivate <strong>{confirmDelete.name}</strong>? They will be hidden from the roster but their data will be preserved.</p>
            <div className="modal-actions">
              <button
                className="usa-button usa-button--secondary"
                onClick={() => deleteResource.mutate(confirmDelete.id)}
                disabled={deleteResource.isPending}
              >
                {deleteResource.isPending ? 'Deactivating…' : 'Yes, Deactivate'}
              </button>
              <button className="usa-button usa-button--outline" onClick={() => setConfirmDelete(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
