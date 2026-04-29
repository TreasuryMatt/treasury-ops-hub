import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api/admin';
import { SortIcon, SortDir } from '../../components/SortIcon';
import { Icon } from '../../components/Icon';

function getField(row: any, key: string) {
  if (key === 'createdAt') return row.createdAt;
  if (key === 'actor') return row.actor?.displayName ?? '';
  return row[key] ?? '';
}

export function AuditLog() {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const { data, isLoading } = useQuery({
    queryKey: ['audit-log', page],
    queryFn: () => adminApi.auditLog({ page: String(page), limit: '50' }),
  });

  function handleSort(field: string) {
    if (sortBy === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(field); setSortDir('asc'); }
  }

  const sortedData = [...(data?.data ?? [])].sort((a: any, b: any) => {
    const av = getField(a, sortBy) ?? '';
    const bv = getField(b, sortBy) ?? '';
    return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });

  return (
    <div className="usa-page">
      <div className="usa-page-header">
        <h1 className="usa-page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="history" color="var(--usa-base-dark)" size={26} />
          Audit Log
        </h1>
        <p className="usa-page-subtitle">Track all changes made in the system</p>
      </div>

      {isLoading ? <span className="usa-spinner" /> : (
        <>
          <table className="usa-table">
            <thead>
              <tr>
                {([['createdAt', 'Timestamp'], ['actor', 'User'], ['action', 'Action'], ['entityType', 'Entity Type'], ['entityId', 'Entity ID']] as [string, string][]).map(([f, label]) => (
                  <th key={f} style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }} onClick={() => handleSort(f)}>
                    {label} <SortIcon field={f} active={sortBy === f} dir={sortDir} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedData.map((log: any) => (
                <tr key={log.id}>
                  <td>{new Date(log.createdAt).toLocaleString()}</td>
                  <td>{log.actor?.displayName || 'System'}</td>
                  <td style={{ textTransform: 'capitalize' }}>{log.action}</td>
                  <td style={{ textTransform: 'capitalize' }}>{log.entityType}</td>
                  <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{log.entityId?.slice(0, 8)}...</td>
                </tr>
              ))}
              {data?.data?.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32 }}>No audit entries yet.</td></tr>
              )}
            </tbody>
          </table>

          {data?.meta?.pages > 1 && (
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
