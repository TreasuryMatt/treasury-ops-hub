import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { intakeApi } from '../../api/intake';
import { IntakeStatusPill } from '../../components/IntakeStatusPill';
import { Icon } from '../../components/Icon';
import { Toast, useToast } from '../../components/Toast';

export function IntakeCustomerHome() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast, show: showToast, dismiss: dismissToast } = useToast();

  useEffect(() => {
    const flash = (location.state as any)?.flash as string | undefined;
    if (flash) {
      showToast(flash);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.key]);
  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['intake', 'mine'],
    queryFn: intakeApi.listMine,
  });

  if (isLoading) {
    return <div className="page-loading"><span className="usa-spinner" aria-label="Loading" /> Loading...</div>;
  }

  return (
    <div className="usa-page">
      <div className="usa-page-header">
        <div>
          <h1 className="usa-page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="summarize" color="#2e8b57" size={26} />
            My intake submissions
          </h1>
          <p className="usa-page-subtitle">Start a request, save drafts, and track leadership determinations.</p>
        </div>
        <button className="usa-button usa-button--primary" onClick={() => navigate('/intake/new')}>
          + New submission
        </button>
      </div>

      <div className="detail-card" style={{ marginBottom: 20 }}>
        <strong>What to include</strong>
        <p style={{ margin: '8px 0 0', color: 'var(--usa-base-dark)' }}>
          Provide the business problem, desired outcomes, requirements, expected savings or impact, and any supporting files.
          You can save a draft and return later before submitting.
        </p>
      </div>

      {submissions.length === 0 ? (
        <div className="empty-state">
          <h3>No submissions yet</h3>
          <p>Create your first intake request to begin the review process.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="usa-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Last Updated</th>
                <th>Determination</th>
                <th>Project</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((submission) => (
                <tr key={submission.id} onClick={() => navigate(`/intake/${submission.id}`)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 600 }}>{submission.title}</td>
                  <td><IntakeStatusPill status={submission.status} /></td>
                  <td>{new Date(submission.updatedAt).toLocaleString()}</td>
                  <td><IntakeStatusPill status={submission.determination || 'pending'} /></td>
                  <td>{submission.linkedProject?.name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}
