import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { risksApi } from '../../api/risks';
import { Icon } from '../../components/Icon';
import { Risk } from '../../types';
import {
  RISK_ACTION_STATUS_LABELS,
  RISK_ACTION_STATUS_STYLES,
  RISK_CRITICALITY_LABELS,
  RISK_CRITICALITY_STYLES,
  RISK_PROGRESS_LABELS,
  RISK_PROGRESS_STYLES,
} from './riskUi';

function Pill({ children, bg, color }: { children: React.ReactNode; bg: string; color: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: 999,
        backgroundColor: bg,
        color,
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {children}
    </span>
  );
}

export function RiskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [comment, setComment] = useState('');

  const { data: risk, isLoading } = useQuery<Risk>({
    queryKey: ['risk', id],
    queryFn: () => risksApi.get(id!),
    enabled: !!id,
  });

  const addComment = useMutation({
    mutationFn: () => risksApi.addComment(id!, comment),
    onSuccess: () => {
      setComment('');
      qc.invalidateQueries({ queryKey: ['risk', id] });
      qc.invalidateQueries({ queryKey: ['risks'] });
    },
  });

  if (isLoading) {
    return <div className="page-loading"><span className="usa-spinner" aria-label="Loading" /> Loading...</div>;
  }

  if (!risk) {
    return <div className="usa-page"><p>Risk not found.</p></div>;
  }

  return (
    <div className="usa-page">
      <div className="usa-page-header">
        <div>
          <button
            className="usa-button usa-button--unstyled"
            onClick={() => navigate('/risks/risks')}
            style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <Icon name="arrow_back" size={16} /> Back to Risks
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 className="usa-page-title" style={{ margin: 0 }}>{risk.title}</h1>
            <Pill {...RISK_PROGRESS_STYLES[risk.progress]}>{RISK_PROGRESS_LABELS[risk.progress]}</Pill>
            <Pill {...RISK_CRITICALITY_STYLES[risk.criticality]}>{RISK_CRITICALITY_LABELS[risk.criticality]}</Pill>
          </div>
          <p className="usa-page-subtitle" style={{ marginTop: 8 }}>
            {risk.riskCode}{risk.spmId ? ` · SPM ${risk.spmId}` : ''}{risk.program ? ` · ${risk.program.name}` : ''}{risk.statusProject ? ` · ${risk.statusProject.name}` : ''}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-3)' }}>
        <div className="detail-card">
          <h2 style={{ marginTop: 0 }}>Risk Summary</h2>
          <dl style={{ margin: 0 }}>
            <dt style={{ fontSize: 12, color: 'var(--usa-base)', textTransform: 'uppercase', fontWeight: 700 }}>Statement</dt>
            <dd style={{ margin: '4px 0 16px 0' }}>{risk.statement}</dd>
            <dt style={{ fontSize: 12, color: 'var(--usa-base)', textTransform: 'uppercase', fontWeight: 700 }}>Impact</dt>
            <dd style={{ margin: '4px 0 16px 0' }}>{risk.impact || '—'}</dd>
            <dt style={{ fontSize: 12, color: 'var(--usa-base)', textTransform: 'uppercase', fontWeight: 700 }}>Closure Criteria</dt>
            <dd style={{ margin: '4px 0 0 0' }}>{risk.closureCriteria || '—'}</dd>
          </dl>
        </div>

        <div className="detail-card">
          <h2 style={{ marginTop: 0 }}>Details</h2>
          <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
            <div>
              <dt style={{ fontSize: 12, color: 'var(--usa-base)', textTransform: 'uppercase', fontWeight: 700 }}>Category</dt>
              <dd style={{ margin: '4px 0 0 0' }}>{risk.category?.name || '—'}</dd>
            </div>
            <div>
              <dt style={{ fontSize: 12, color: 'var(--usa-base)', textTransform: 'uppercase', fontWeight: 700 }}>Risk Owner</dt>
              <dd style={{ margin: '4px 0 0 0' }}>{risk.program?.federalOwner || '—'}</dd>
            </div>
            <div>
              <dt style={{ fontSize: 12, color: 'var(--usa-base)', textTransform: 'uppercase', fontWeight: 700 }}>Submitter</dt>
              <dd style={{ margin: '4px 0 0 0' }}>{risk.submitter?.displayName || '—'}</dd>
            </div>
            <div>
              <dt style={{ fontSize: 12, color: 'var(--usa-base)', textTransform: 'uppercase', fontWeight: 700 }}>Date Identified</dt>
              <dd style={{ margin: '4px 0 0 0' }}>{risk.dateIdentified ? new Date(risk.dateIdentified).toLocaleDateString() : '—'}</dd>
            </div>
            <div>
              <dt style={{ fontSize: 12, color: 'var(--usa-base)', textTransform: 'uppercase', fontWeight: 700 }}>Impact Date</dt>
              <dd style={{ margin: '4px 0 0 0' }}>{risk.impactDate ? new Date(risk.impactDate).toLocaleDateString() : '—'}</dd>
            </div>
            <div>
              <dt style={{ fontSize: 12, color: 'var(--usa-base)', textTransform: 'uppercase', fontWeight: 700 }}>Probability</dt>
              <dd style={{ margin: '4px 0 0 0' }}>{risk.probability ?? 'Pending later calculation'}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="detail-card" style={{ marginTop: 'var(--space-3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Mitigation Plan</h2>
          <span style={{ fontSize: 13, color: 'var(--usa-base-dark)' }}>{risk.mitigationActions?.length || 0} action step{risk.mitigationActions?.length === 1 ? '' : 's'}</span>
        </div>
        {risk.mitigationActions && risk.mitigationActions.length > 0 ? (
          <table className="usa-table">
            <thead>
              <tr>
                <th>Action Step</th>
                <th>Due Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {risk.mitigationActions.map((action) => (
                <tr key={action.id}>
                  <td>{action.title}</td>
                  <td>{action.dueDate ? new Date(action.dueDate).toLocaleDateString() : '—'}</td>
                  <td>
                    <Pill {...RISK_ACTION_STATUS_STYLES[action.status]}>
                      {RISK_ACTION_STATUS_LABELS[action.status]}
                    </Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ margin: 0, color: 'var(--usa-base-dark)' }}>No mitigation actions recorded yet.</p>
        )}
      </div>

      <div className="detail-card" style={{ marginTop: 'var(--space-3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Comments</h2>
          <span style={{ fontSize: 13, color: 'var(--usa-base-dark)' }}>{risk.comments?.length || 0} comment{risk.comments?.length === 1 ? '' : 's'}</span>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="usa-label">Add Comment</label>
          <textarea className="usa-textarea" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add context, new findings, or a status note" />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="usa-button usa-button--outline usa-button--sm" onClick={() => addComment.mutate()} disabled={addComment.isPending || !comment.trim()}>
              {addComment.isPending ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        </div>

        {risk.comments && risk.comments.length > 0 ? (
          <div style={{ display: 'grid', gap: 12 }}>
            {risk.comments.map((entry) => (
              <div key={entry.id} style={{ border: '1px solid var(--usa-base-lighter)', borderRadius: 8, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                  <strong>{entry.author?.displayName || 'Unknown user'}</strong>
                  <span style={{ fontSize: 12, color: 'var(--usa-base-dark)' }}>{new Date(entry.createdAt).toLocaleString()}</span>
                </div>
                <div>{entry.text}</div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ margin: 0, color: 'var(--usa-base-dark)' }}>No comments yet.</p>
        )}
      </div>
    </div>
  );
}
