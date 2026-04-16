import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { intakeApi } from '../../api/intake';
import { IntakeStatusPill } from '../../components/IntakeStatusPill';

export function IntakeReviewerQueue() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['intake', 'review', 'queue', status, search],
    queryFn: () => intakeApi.listAll({ ...(status ? { status } : {}), ...(search ? { search } : {}) }),
  });

  if (isLoading) {
    return <div className="page-loading"><span className="usa-spinner" aria-label="Loading" /> Loading...</div>;
  }

  const submissions = data?.data || [];

  return (
    <div className="usa-page">
      <div className="usa-page-header">
        <div>
          <h1 className="usa-page-title">Intake submission queue</h1>
          <p className="usa-page-subtitle">{data?.meta?.total ?? submissions.length} total submissions</p>
        </div>
      </div>

      <div className="filter-bar">
        <input className="usa-input" placeholder="Search title or submitter" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="usa-select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="under_review">Under Review</option>
          <option value="backlog">Backlog</option>
          <option value="denied">Denied</option>
          <option value="approved">Approved</option>
        </select>
      </div>

      <div className="table-wrap">
        <table className="usa-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Submitter</th>
              <th>Status</th>
              <th>AI Score</th>
              <th>Updated</th>
              <th>Versions</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((submission) => (
              <tr key={submission.id} onClick={() => navigate(`/intake/review/submissions/${submission.id}`)} style={{ cursor: 'pointer' }}>
                <td style={{ fontWeight: 600 }}>{submission.title}</td>
                <td>{submission.submitter?.displayName || '—'}</td>
                <td><IntakeStatusPill status={submission.status} /></td>
                <td>{submission.aiScore ?? '—'}</td>
                <td>{new Date(submission.updatedAt).toLocaleString()}</td>
                <td>{submission._count?.versions ?? submission.versions?.length ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
