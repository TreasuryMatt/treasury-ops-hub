import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api/admin';

export function AuditLog() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-log', page],
    queryFn: () => adminApi.auditLog({ page: String(page), limit: '50' }),
  });

  return (
    <div className="usa-page">
      <div className="usa-page-header">
        <h1 className="usa-page-title">Audit Log</h1>
        <p className="usa-page-subtitle">Track all changes made in the system</p>
      </div>

      {isLoading ? <span className="usa-spinner" /> : (
        <>
          <table className="usa-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Entity Type</th>
                <th>Entity ID</th>
              </tr>
            </thead>
            <tbody>
              {data?.data?.map((log: any) => (
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
