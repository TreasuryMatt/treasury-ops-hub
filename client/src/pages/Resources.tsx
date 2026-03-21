import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { resourcesApi } from '../api/resources';
import { adminApi } from '../api/admin';
import { useAuth } from '../context/AuthContext';
import { Icon } from '../components/Icon';

type SortField = 'lastName' | 'firstName' | 'division' | 'functionalArea' | 'primaryRole' | 'resourceType' | 'supervisor';
type SortDir = 'asc' | 'desc';

function SortIcon({ field, active, dir }: { field: string; active: boolean; dir: SortDir }) {
  if (!active) return <span style={{ opacity: 0.3, marginLeft: 4 }}>↕</span>;
  return <span style={{ marginLeft: 4 }}>{dir === 'asc' ? '↑' : '↓'}</span>;
}

export function Resources() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [division, setDivision] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [roleId, setRoleId] = useState('');
  const [functionalAreaId, setFunctionalAreaId] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('lastName');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
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
    if (sortBy === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
    setPage(1);
  }

  function handleDivisionChange(val: string) {
    setDivision(val);
    setFunctionalAreaId(''); // reset FA when division changes
    setPage(1);
  }

  const utilizationColor = (pct: number) => {
    if (pct > 1) return 'var(--usa-error)';
    if (pct >= 0.8) return 'var(--usa-warning-dark)';
    if (pct >= 0.5) return 'var(--usa-primary)';
    return 'var(--usa-success)';
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
        {(user?.role === 'editor' || user?.role === 'admin') && (
          <button className="usa-button" onClick={() => navigate('/resources/new')}>
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
                <th>Utilization</th>
                <th>Available</th>
              </tr>
            </thead>
            <tbody>
              {data?.data.map((r) => (
                <tr key={r.id} onClick={() => navigate(`/resources/${r.id}`)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 600 }}>{r.lastName}, {r.firstName}</td>
                  <td>
                    <span className={`badge badge--${r.resourceType}`}>
                      {r.resourceType === 'federal' ? 'FED' : 'CTR'}
                    </span>
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{r.division}</td>
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
                </tr>
              ))}
              {data?.data.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32 }}>No resources found.</td></tr>
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
    </div>
  );
}
