import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { requestsApi } from '../api/requests';
import { resourcesApi } from '../api/resources';
import { useAuth } from '../context/AuthContext';
import { Icon } from '../components/Icon';
import { ResourceRequest, RequestStatus } from '../types';

const STATUS_LABELS: Record<RequestStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  denied: 'Denied',
};

const STATUS_COLORS: Record<RequestStatus, string> = {
  pending: '#ffbe2e',
  approved: '#00a91c',
  denied: '#e52207',
};

function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: 12,
      fontSize: 12,
      fontWeight: 600,
      background: STATUS_COLORS[status] + '22',
      color: STATUS_COLORS[status],
      border: `1px solid ${STATUS_COLORS[status]}44`,
    }}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface ReviewModalProps {
  request: ResourceRequest;
  action: 'approved' | 'denied';
  onClose: () => void;
  onConfirm: (reviewNote: string, resourceId?: string) => void;
  isPending: boolean;
}

function utilizationColor(pct: number) {
  if (pct >= 1) return '#e52207';
  if (pct >= 0.8) return '#ffbe2e';
  return '#00a91c';
}

function ReviewModal({ request, action, onClose, onConfirm, isPending }: ReviewModalProps) {
  const [note, setNote] = useState('');
  const [selectedResourceId, setSelectedResourceId] = useState('');
  const projectName = request.project?.name ?? request.projectOther ?? '—';
  const canAssign = action === 'approved' && !!request.projectId;

  // Fetch resources filtered by role (if present), exclude fully utilized
  const resourceParams: Record<string, string> = { limit: '200', sortBy: 'lastName', sortDir: 'asc' };
  if (request.roleId) resourceParams.roleId = request.roleId;

  const { data: resourcesData } = useQuery({
    queryKey: ['resources-for-request', request.roleId],
    queryFn: () => resourcesApi.list(resourceParams),
    enabled: canAssign,
  });

  const availableResources = resourcesData?.data.filter((r) => r.totalPercentUtilized < 1) ?? [];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: '#fff', borderRadius: 8, padding: 28,
        maxWidth: canAssign ? 560 : 480, width: '100%',
        boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <h2 style={{ marginTop: 0, fontSize: 20 }}>
          {action === 'approved' ? 'Approve' : 'Deny'} Request
        </h2>
        <p style={{ color: '#565c65', marginBottom: 16 }}>
          Request from <strong>{request.requestor.displayName}</strong> for project <strong>{projectName}</strong>
          {request.role && <> · Role: <strong>{request.role.name}</strong></>}
          {request.percentNeeded != null && <> · {request.percentNeeded}% utilization</>}.
        </p>

        {canAssign && (
          <div className="usa-form-group" style={{ marginBottom: 20 }}>
            <label className="usa-label" style={{ fontWeight: 600 }}>
              Assign a Resource
              {request.role && <span style={{ fontWeight: 400, color: '#565c65' }}> — {request.role.name}s with available capacity</span>}
            </label>
            {availableResources.length === 0 ? (
              <div style={{ padding: '10px 12px', background: '#f0f0f0', borderRadius: 4, fontSize: 13, color: '#565c65' }}>
                {resourcesData ? 'No resources with available capacity found for this role.' : 'Loading resources…'}
              </div>
            ) : (
              <div style={{ border: '1px solid #dfe1e2', borderRadius: 4, maxHeight: 220, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f0f0f0', position: 'sticky', top: 0 }}>
                      <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600 }}></th>
                      <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600 }}>Name</th>
                      <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600 }}>Division</th>
                      <th style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600 }}>Utilized</th>
                      <th style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600 }}>Available</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableResources.map((r) => {
                      const utilized = Math.round(r.totalPercentUtilized * 100);
                      const available = Math.round(r.availableCapacity * 100);
                      const isSelected = selectedResourceId === r.id;
                      return (
                        <tr
                          key={r.id}
                          onClick={() => setSelectedResourceId(isSelected ? '' : r.id)}
                          style={{
                            cursor: 'pointer',
                            background: isSelected ? '#d9e8ff' : undefined,
                            borderTop: '1px solid #f0f0f0',
                          }}
                        >
                          <td style={{ padding: '6px 10px', width: 28 }}>
                            <input
                              type="radio"
                              readOnly
                              checked={isSelected}
                              style={{ cursor: 'pointer' }}
                            />
                          </td>
                          <td style={{ padding: '6px 10px' }}>
                            {r.lastName}, {r.firstName}
                            <span style={{ marginLeft: 6, fontSize: 11, color: '#71767a' }}>
                              {r.resourceType === 'federal' ? 'FED' : 'CTR'}
                            </span>
                          </td>
                          <td style={{ padding: '6px 10px', color: '#565c65' }}>{r.division}</td>
                          <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 500, color: utilizationColor(r.totalPercentUtilized) }}>
                            {utilized}%
                          </td>
                          <td style={{ padding: '6px 10px', textAlign: 'right', color: '#00a91c', fontWeight: 500 }}>
                            {available}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {selectedResourceId && (
              <p style={{ margin: '8px 0 0', fontSize: 12, color: '#005ea2' }}>
                ✓ An assignment will be created for this resource on <strong>{projectName}</strong>.
              </p>
            )}
            {action === 'approved' && !request.projectId && (
              <p style={{ margin: '8px 0 0', fontSize: 12, color: '#71767a' }}>
                This request used a custom project name — assignments can only be created for existing projects.
              </p>
            )}
          </div>
        )}

        <div className="usa-form-group">
          <label className="usa-label" htmlFor="reviewNote">
            Note {action === 'denied' ? '(recommended)' : '(optional)'}
          </label>
          <textarea
            id="reviewNote"
            className="usa-textarea"
            rows={3}
            placeholder={action === 'approved' ? 'Any notes for the requestor...' : 'Reason for denial...'}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button
            className={`usa-button ${action === 'approved' ? 'usa-button--primary' : 'usa-button--secondary'}`}
            onClick={() => onConfirm(note, selectedResourceId || undefined)}
            disabled={isPending}
          >
            {isPending ? 'Saving...' : action === 'approved' ? 'Approve' : 'Deny'}
          </button>
          <button className="usa-button usa-button--outline" onClick={onClose} disabled={isPending}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function ResourceRequests() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const isManagerOrAdmin = user?.isResourceManager || user?.role === 'manager' || user?.role === 'admin';

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [reviewTarget, setReviewTarget] = useState<{ request: ResourceRequest; action: 'approved' | 'denied' } | null>(null);

  const params: Record<string, string> = {};
  if (statusFilter) params.status = statusFilter;

  const { data: requests, isLoading } = useQuery({
    queryKey: ['requests', params],
    queryFn: () => requestsApi.list(params),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, status, reviewNote, resourceId }: { id: string; status: 'approved' | 'denied'; reviewNote: string; resourceId?: string }) =>
      requestsApi.review(id, { status, reviewNote, resourceId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requests'] });
      qc.invalidateQueries({ queryKey: ['resources'] });
      qc.invalidateQueries({ queryKey: ['resources-for-request'] });
      setReviewTarget(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => requestsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['requests'] }),
  });

  const statusTabs: Array<{ value: string; label: string }> = [
    { value: '', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'denied', label: 'Denied' },
  ];

  return (
    <div className="usa-page">
      <div className="usa-page-header">
        <h1 className="usa-page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="pending_actions" color="var(--usa-primary)" size={26} />
          Resource Requests
        </h1>
        <p className="usa-page-subtitle">
          {isManagerOrAdmin ? 'All requests across the organization' : 'Your submitted requests'}
        </p>
      </div>

      <div className="filter-bar">
        <div style={{ display: 'flex', gap: 8 }}>
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              className={`usa-button ${statusFilter === tab.value ? 'usa-button--primary' : 'usa-button--outline'}`}
              style={{ padding: '6px 16px', fontSize: 13 }}
              onClick={() => setStatusFilter(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <button className="usa-button usa-button--primary" onClick={() => navigate('/staffing/requests/new')}>
          <Icon name="add" size={16} /> New Request
        </button>
      </div>

      {isLoading ? (
        <div style={{ padding: 32, textAlign: 'center', color: '#565c65' }}>Loading...</div>
      ) : !requests?.length ? (
        <div style={{ padding: 48, textAlign: 'center', color: '#565c65' }}>
          <Icon name="pending_actions" size={40} color="#a9aeb1" />
          <p style={{ marginTop: 12 }}>No requests found.</p>
          <button className="usa-button usa-button--outline" onClick={() => navigate('/staffing/requests/new')}>
            Submit a Request
          </button>
        </div>
      ) : (
        <div className="usa-table-container--scrollable">
          <table className="usa-table usa-table--borderless usa-table--striped" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Date</th>
                {isManagerOrAdmin && <th>Requestor</th>}
                <th>Project</th>
                <th>Role</th>
                <th>Type</th>
                <th>% Needed</th>
                <th>Start</th>
                <th>End</th>
                <th>Status</th>
                {isManagerOrAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDate(r.createdAt)}</td>
                  {isManagerOrAdmin && (
                    <td>{r.requestor.displayName}</td>
                  )}
                  <td>
                    {r.project?.name ?? r.projectOther ?? '—'}
                  </td>
                  <td>{r.role?.name ?? '—'}</td>
                  <td>
                    {r.resourceType ? (
                      <span className={`resource-badge resource-badge--${r.resourceType}`}>
                        {r.resourceType === 'federal' ? 'FED' : 'CTR'}
                      </span>
                    ) : '—'}
                  </td>
                  <td>{r.percentNeeded != null ? `${r.percentNeeded}%` : '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDate(r.startDate)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDate(r.endDate)}</td>
                  <td>
                    <div>
                      <StatusBadge status={r.status} />
                      {r.reviewNote && (
                        <div style={{ fontSize: 11, color: '#565c65', marginTop: 4, maxWidth: 180 }} title={r.reviewNote}>
                          {r.reviewNote.length > 60 ? r.reviewNote.slice(0, 57) + '...' : r.reviewNote}
                        </div>
                      )}
                    </div>
                  </td>
                  {isManagerOrAdmin && (
                    <td>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {r.status === 'pending' && (
                          <>
                            <button
                              className="usa-button usa-button--outline"
                              style={{ padding: '4px 10px', fontSize: 12, color: '#00a91c', borderColor: '#00a91c' }}
                              onClick={() => setReviewTarget({ request: r, action: 'approved' })}
                              title="Approve"
                            >
                              Approve
                            </button>
                            <button
                              className="usa-button usa-button--outline"
                              style={{ padding: '4px 10px', fontSize: 12, color: '#e52207', borderColor: '#e52207' }}
                              onClick={() => setReviewTarget({ request: r, action: 'denied' })}
                              title="Deny"
                            >
                              Deny
                            </button>
                          </>
                        )}
                        <button
                          className="usa-button usa-button--unstyled"
                          style={{ color: '#e52207' }}
                          onClick={() => {
                            if (window.confirm('Delete this request?')) deleteMutation.mutate(r.id);
                          }}
                          title="Delete request"
                          aria-label="Delete request"
                        >
                          <Icon name="delete" size={18} color="#e52207" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {reviewTarget && (
        <ReviewModal
          request={reviewTarget.request}
          action={reviewTarget.action}
          onClose={() => setReviewTarget(null)}
          onConfirm={(reviewNote, resourceId) =>
            reviewMutation.mutate({ id: reviewTarget.request.id, status: reviewTarget.action, reviewNote, resourceId })
          }
          isPending={reviewMutation.isPending}
        />
      )}
    </div>
  );
}
