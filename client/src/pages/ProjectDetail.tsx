import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '../api/projects';
import { assignmentsApi } from '../api/assignments';
import { useAuth } from '../context/AuthContext';
import { Icon } from '../components/Icon';

const STATUS_LABELS: Record<string, string> = {
  in_progress: 'In Progress',
  on_hold: 'On Hold',
  completed: 'Completed',
};

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const canEdit = user?.role === 'editor' || user?.role === 'admin';

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(id!),
  });

  const removeAssignment = useMutation({
    mutationFn: (aId: string) => assignmentsApi.remove(aId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project', id] }),
  });

  if (isLoading || !project) {
    return <div className="usa-page"><span className="usa-spinner" aria-label="Loading" /></div>;
  }

  const totalUtilization = project.assignments.reduce((sum, a) => sum + a.percentUtilized, 0);

  return (
    <div className="usa-page">
      <div className="usa-page-header">
        <button className="usa-button usa-button--unstyled" onClick={() => navigate('/projects')} style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Icon name="arrow_back" size={16} /> Back to Projects
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="usa-page-title">{project.name}</h1>
            <p className="usa-page-subtitle">
              <span className={`status-badge status-badge--${project.status}`}>{STATUS_LABELS[project.status]}</span>
              {project.product && <span> / {project.product.name}</span>}
            </p>
          </div>
          {canEdit && (
            <button className="usa-button" onClick={() => navigate(`/projects/${id}/edit`)}>
              <Icon name="edit" color="white" size={16} /> Edit
            </button>
          )}
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-card">
          <h3>Project Details</h3>
          <dl className="detail-list">
            <dt>Product</dt><dd>{project.product?.name || '-'}</dd>
            <dt>Priority</dt><dd style={{ textTransform: 'capitalize' }}>{project.priority || '-'}</dd>
            <dt>Status</dt><dd>{STATUS_LABELS[project.status]}</dd>
            <dt>Start Date</dt><dd>{project.startDate ? new Date(project.startDate).toLocaleDateString() : '-'}</dd>
            <dt>End Date</dt><dd>{project.endDate ? new Date(project.endDate).toLocaleDateString() : '-'}</dd>
          </dl>
        </div>

        <div className="detail-card">
          <h3>Team Summary</h3>
          <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--usa-primary)' }}>{project.teamSize}</div>
          <div style={{ fontSize: 14, color: 'var(--usa-base)' }}>Team Members</div>
          <div style={{ marginTop: 12, fontSize: 24, fontWeight: 600 }}>
            {Math.round(totalUtilization * 100)}%
          </div>
          <div style={{ fontSize: 14, color: 'var(--usa-base)' }}>Total FTE Allocation</div>
        </div>
      </div>

      {project.description && (
        <div className="detail-card" style={{ marginTop: 16 }}>
          <h3>Description</h3>
          <p>{project.description}</p>
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>Team Roster ({project.assignments.length})</h2>
        <table className="usa-table">
          <thead>
            <tr>
              <th>Resource</th>
              <th>Role</th>
              <th>% Allocated</th>
              <th>Start</th>
              <th>End</th>
              {canEdit && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {project.assignments.map((a) => (
              <tr key={a.id}>
                <td
                  style={{ fontWeight: 600, cursor: 'pointer', color: 'var(--usa-primary)' }}
                  onClick={() => navigate(`/resources/${a.resourceId}`)}
                >
                  {a.resource ? `${a.resource.lastName}, ${a.resource.firstName}` : a.resourceId}
                </td>
                <td>{a.role?.name || '-'}</td>
                <td>{Math.round(a.percentUtilized * 100)}%</td>
                <td>{a.startDate ? new Date(a.startDate).toLocaleDateString() : '-'}</td>
                <td>{a.endDate ? new Date(a.endDate).toLocaleDateString() : '-'}</td>
                {canEdit && (
                  <td>
                    <button className="usa-button usa-button--unstyled" onClick={() => removeAssignment.mutate(a.id)} style={{ color: 'var(--usa-error)' }}>
                      <Icon name="delete" size={16} color="var(--usa-error)" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {project.assignments.length === 0 && (
              <tr><td colSpan={canEdit ? 6 : 5} style={{ textAlign: 'center', padding: 24 }}>No team members assigned.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
