import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { intakeApi } from '../../api/intake';
import { IntakeStatusPill } from '../../components/IntakeStatusPill';
import { Icon } from '../../components/Icon';

export function IntakeReviewerDashboard() {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useQuery({
    queryKey: ['intake', 'dashboard'],
    queryFn: intakeApi.dashboardStats,
  });

  if (isLoading) {
    return <div className="page-loading"><span className="usa-spinner" aria-label="Loading" /> Loading...</div>;
  }

  if (!stats) return null;

  const cards = [
    { label: 'Total', value: stats.total, status: '' },
    { label: 'Submitted', value: stats.byStatus.submitted, status: 'submitted' },
    { label: 'Under Review', value: stats.byStatus.under_review, status: 'under_review' },
    { label: 'Approved', value: stats.byStatus.approved, status: 'approved' },
    { label: 'Denied', value: stats.byStatus.denied, status: 'denied' },
    { label: 'Backlog', value: stats.byStatus.backlog, status: 'backlog' },
  ];

  return (
    <div className="usa-page">
      <div className="usa-page-header">
        <div>
          <h1 className="usa-page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="assessment" color="#2e8b57" size={26} />
            Intake review dashboard
          </h1>
          <p className="usa-page-subtitle">Review pipeline health, recent submissions, and AI scoring activity.</p>
        </div>
        <button className="usa-button usa-button--outline" onClick={() => navigate('/intake/review/submissions')}>
          Open submission queue
        </button>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
        {cards.map((card) => (
          <div
            key={card.label}
            className="stat-card stat-card--clickable"
            onClick={() => card.status && navigate(`/intake/review/submissions?status=${card.status}`)}
          >
            <div className="stat-card__value">{card.value}</div>
            <div className="stat-card__label">{card.label}</div>
          </div>
        ))}
        <div className="stat-card">
          <div className="stat-card__value">{stats.avgScore == null ? '—' : Math.round(stats.avgScore)}</div>
          <div className="stat-card__label">Average AI score</div>
        </div>
      </div>

      <div className="table-wrap" style={{ marginTop: 20 }}>
        <table className="usa-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Submitter</th>
              <th>Status</th>
              <th>Score</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
              {stats.recentSubmissions.map((submission) => (
                <tr key={submission.id} onClick={() => navigate(`/intake/review/submissions/${submission.id}`)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 600 }}>{submission.title}</td>
                  <td>{submission.submitter?.displayName || '—'}</td>
                  <td><IntakeStatusPill status={submission.status} /></td>
                  <td>{submission.aiScore ?? '—'}</td>
                  <td>{new Date(submission.updatedAt).toLocaleString()}</td>
                </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
