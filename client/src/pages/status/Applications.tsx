import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { applicationsApi } from '../../api/applications';
import { useAuth } from '../../context/AuthContext';
import { Application } from '../../types';
import { Icon } from '../../components/Icon';

export function Applications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = user?.role === 'editor' || user?.role === 'manager' || user?.role === 'admin';

  const { data: applications = [], isLoading } = useQuery<Application[]>({
    queryKey: ['applications'],
    queryFn: () => applicationsApi.list(),
  });

  const grouped = applications.reduce<Record<string, Application[]>>((acc, application) => {
    const key = application.program?.name || 'No Program';
    if (!acc[key]) acc[key] = [];
    acc[key].push(application);
    return acc;
  }, {});

  const groups = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));

  if (isLoading) {
    return <div className="page-loading"><span className="usa-spinner" aria-label="Loading" /> Loading...</div>;
  }

  return (
    <div className="usa-page">
      <div className="usa-page-header">
        <div>
          <h1 className="usa-page-title">Applications</h1>
          <p className="usa-page-subtitle">{applications.length} application{applications.length !== 1 ? 's' : ''}</p>
        </div>
        {canEdit && (
          <button className="usa-button usa-button--outline usa-button--sm" onClick={() => navigate('/status/applications/new')}>
            + New Application
          </button>
        )}
      </div>

      {applications.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon"><Icon name="tune" size={48} /></div>
          <h3>No applications yet</h3>
          <p>Create an application and assign it to a program to start organizing projects.</p>
        </div>
      ) : (
        groups.map(([programName, programApplications]) => (
          <div key={programName} style={{ marginBottom: 'var(--space-4)' }}>
            <div className="section-header">
              <h2 className="section-title">{programName}</h2>
            </div>
            <div className="table-wrap">
              <table className="usa-table">
                <thead>
                  <tr>
                    <th>Application</th>
                    <th>Description</th>
                    <th>Projects</th>
                    {canEdit && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {programApplications.map((application) => (
                    <tr key={application.id}>
                      <td style={{ fontWeight: 600 }}>{application.name}</td>
                    <td>{application.description || '—'}</td>
                    <td>{application._count?.statusProjects ?? 0}</td>
                    {canEdit && (
                      <td>
                        <button
                          className="usa-button usa-button--unstyled"
                          onClick={() => navigate(`/status/applications/${application.id}/edit`)}
                        >
                          Edit
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
