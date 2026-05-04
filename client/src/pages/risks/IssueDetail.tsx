import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { issuesApi } from '../../api/issues';
import { programsApi } from '../../api/programs';
import { statusProjectsApi } from '../../api/statusProjects';
import { adminApi } from '../../api/admin';
import { Icon } from '../../components/Icon';
import {
  Program,
  Risk,
  RiskActionStatus,
  RiskCategory,
  RiskCriticality,
  RiskMitigationAction,
  RiskProgress,
  StatusProject,
} from '../../types';
import {
  RISK_ACTION_STATUS_LABELS,
  RISK_ACTION_STATUS_STYLES,
  RISK_CRITICALITY_LABELS,
  RISK_CRITICALITY_STYLES,
  RISK_PROGRESS_LABELS,
  RISK_PROGRESS_STYLES,
} from './riskUi';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Pill({ children, bg, color }: { children: React.ReactNode; bg: string; color: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 999, backgroundColor: bg, color, fontSize: 12, fontWeight: 700 }}>
      {children}
    </span>
  );
}

type ActionDraft = { title: string; dueDate: string; status: RiskActionStatus; isComplete: boolean };
const EMPTY_DRAFT: ActionDraft = { title: '', dueDate: '', status: 'yellow', isComplete: false };

// ─── Mitigation row ───────────────────────────────────────────────────────────

function MitigationRow({ action, impactDate, issueId, onSaved }: {
  action: RiskMitigationAction;
  impactDate: string | null;
  issueId: string;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ActionDraft>({
    title: action.title,
    dueDate: action.dueDate ? action.dueDate.slice(0, 10) : '',
    status: action.status,
    isComplete: action.isComplete,
  });
  const [error, setError] = useState('');

  const update = useMutation({
    mutationFn: () => issuesApi.updateMitigationAction(issueId, action.id, draft),
    onSuccess: () => { setEditing(false); setError(''); onSaved(); },
    onError: (e: any) => setError(e?.response?.data?.error || e.message || 'Failed to save'),
  });

  const toggleComplete = useMutation({
    mutationFn: () => issuesApi.updateMitigationAction(issueId, action.id, { isComplete: !action.isComplete }),
    onSuccess: onSaved,
  });

  const remove = useMutation({
    mutationFn: () => issuesApi.deleteMitigationAction(issueId, action.id),
    onSuccess: onSaved,
  });

  function validate() {
    if (!draft.title.trim()) return 'Description is required.';
    if (draft.dueDate && impactDate && new Date(draft.dueDate) > new Date(impactDate))
      return `Due date cannot be after the impact date (${new Date(impactDate).toLocaleDateString()}).`;
    return '';
  }

  if (!editing) {
    return (
      <tr style={action.isComplete ? { opacity: 0.6 } : undefined}>
        <td style={{ textAlign: 'center' }}>
          <input
            type="checkbox"
            checked={action.isComplete}
            disabled={toggleComplete.isPending}
            onChange={() => toggleComplete.mutate()}
            aria-label="Mark complete"
            style={{ width: 16, height: 16, cursor: 'pointer' }}
          />
        </td>
        <td style={action.isComplete ? { textDecoration: 'line-through' } : undefined}>{action.title}</td>
        <td>{action.dueDate ? new Date(action.dueDate).toLocaleDateString() : '—'}</td>
        <td><Pill {...RISK_ACTION_STATUS_STYLES[action.status]}>{RISK_ACTION_STATUS_LABELS[action.status]}</Pill></td>
        <td style={{ whiteSpace: 'nowrap' }}>
          <button className="usa-button usa-button--unstyled" style={{ marginRight: 12 }} onClick={() => setEditing(true)}>
            <Icon name="edit" size={15} /> Edit
          </button>
          <button className="usa-button usa-button--unstyled" style={{ color: 'var(--usa-error)' }} onClick={() => remove.mutate()} disabled={remove.isPending}>
            <Icon name="delete" size={15} /> Remove
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td />
      <td>
        <input className="usa-input" value={draft.title} onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))} />
        {error && <div style={{ color: 'var(--usa-error)', fontSize: 12, marginTop: 2 }}>{error}</div>}
      </td>
      <td>
        <input className="usa-input" type="date" value={draft.dueDate}
          max={impactDate ? impactDate.slice(0, 10) : undefined}
          onChange={(e) => setDraft((p) => ({ ...p, dueDate: e.target.value }))} />
      </td>
      <td>
        <select className="usa-select" value={draft.status} onChange={(e) => setDraft((p) => ({ ...p, status: e.target.value as RiskActionStatus }))}>
          {(Object.keys(RISK_ACTION_STATUS_LABELS) as RiskActionStatus[]).map((s) => (
            <option key={s} value={s}>{RISK_ACTION_STATUS_LABELS[s]}</option>
          ))}
        </select>
      </td>
      <td style={{ whiteSpace: 'nowrap' }}>
        <button className="usa-button usa-button--unstyled" style={{ marginRight: 12 }} disabled={update.isPending}
          onClick={() => { const err = validate(); if (err) { setError(err); return; } update.mutate(); }}>
          Save
        </button>
        <button className="usa-button usa-button--unstyled" style={{ color: 'var(--usa-base-dark)' }}
          onClick={() => { setEditing(false); setError(''); }}>
          Cancel
        </button>
      </td>
    </tr>
  );
}

function AddActionRow({ issueId, impactDate, onSaved, onCancel }: {
  issueId: string;
  impactDate: string | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<ActionDraft>(EMPTY_DRAFT);
  const [error, setError] = useState('');

  const add = useMutation({
    mutationFn: () => issuesApi.addMitigationAction(issueId, draft),
    onSuccess: onSaved,
    onError: (e: any) => setError(e?.response?.data?.error || e.message || 'Failed to save'),
  });

  function validate() {
    if (!draft.title.trim()) return 'Description is required.';
    if (draft.dueDate && impactDate && new Date(draft.dueDate) > new Date(impactDate))
      return `Due date cannot be after the impact date (${new Date(impactDate).toLocaleDateString()}).`;
    return '';
  }

  return (
    <tr style={{ background: 'var(--usa-primary-lighter)' }}>
      <td />
      <td>
        <input className="usa-input" placeholder="Describe the action step…" value={draft.title}
          onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))} />
        {error && <div style={{ color: 'var(--usa-error)', fontSize: 12, marginTop: 2 }}>{error}</div>}
      </td>
      <td>
        <input className="usa-input" type="date" value={draft.dueDate}
          max={impactDate ? impactDate.slice(0, 10) : undefined}
          onChange={(e) => setDraft((p) => ({ ...p, dueDate: e.target.value }))} />
      </td>
      <td>
        <select className="usa-select" value={draft.status} onChange={(e) => setDraft((p) => ({ ...p, status: e.target.value as RiskActionStatus }))}>
          {(Object.keys(RISK_ACTION_STATUS_LABELS) as RiskActionStatus[]).map((s) => (
            <option key={s} value={s}>{RISK_ACTION_STATUS_LABELS[s]}</option>
          ))}
        </select>
      </td>
      <td style={{ whiteSpace: 'nowrap' }}>
        <button className="usa-button usa-button--success usa-button--sm" disabled={add.isPending}
          onClick={() => { const err = validate(); if (err) { setError(err); return; } add.mutate(); }}>
          {add.isPending ? 'Adding…' : 'Add'}
        </button>
        <button className="usa-button usa-button--outline usa-button--sm" style={{ marginLeft: 8 }} onClick={onCancel}>
          Cancel
        </button>
      </td>
    </tr>
  );
}

// ─── Edit draft type ──────────────────────────────────────────────────────────

type IssueDraft = {
  progress: RiskProgress;
  programId: string;
  statusProjectId: string;
  categoryId: string;
  spmId: string;
  title: string;
  statement: string;
  criticality: RiskCriticality;
  dateIdentified: string;
  impact: string;
  impactDate: string;
  closureCriteria: string;
};

function issueToDraft(issue: Risk): IssueDraft {
  return {
    progress: issue.progress,
    programId: issue.programId,
    statusProjectId: issue.statusProjectId,
    categoryId: issue.categoryId,
    spmId: issue.spmId || '',
    title: issue.title,
    statement: issue.statement,
    criticality: issue.criticality,
    dateIdentified: issue.dateIdentified ? issue.dateIdentified.slice(0, 10) : '',
    impact: issue.impact || '',
    impactDate: issue.impactDate ? issue.impactDate.slice(0, 10) : '',
    closureCriteria: issue.closureCriteria || '',
  };
}

// ─── Main component ───────────────────────────────────────────────────────────

export function IssueDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [comment, setComment] = useState('');
  const [addingAction, setAddingAction] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<IssueDraft | null>(null);
  const [editError, setEditError] = useState('');

  const { data: issue, isLoading } = useQuery<Risk>({
    queryKey: ['issue', id],
    queryFn: () => issuesApi.get(id!),
    enabled: !!id,
  });

  const { data: programs = [] } = useQuery<Program[]>({
    queryKey: ['programs'],
    queryFn: programsApi.list,
    enabled: editing,
  });

  const { data: allProjects = [] } = useQuery<StatusProject[]>({
    queryKey: ['status-projects', 'issue-edit'],
    queryFn: () => statusProjectsApi.list({}),
    enabled: editing,
  });

  const { data: categories = [] } = useQuery<RiskCategory[]>({
    queryKey: ['risk-categories'],
    queryFn: adminApi.riskCategories,
    enabled: editing,
  });

  const visibleProjects = allProjects.filter((p) => !draft?.programId || p.programId === draft.programId);
  const selectedProgram = programs.find((p) => p.id === draft?.programId);

  useEffect(() => {
    if (issue && editing && !draft) setDraft(issueToDraft(issue));
  }, [issue, editing, draft]);

  const updateIssue = useMutation({
    mutationFn: () => issuesApi.update(id!, {
      ...draft,
      spmId: draft?.spmId || null,
      dateIdentified: draft?.dateIdentified || null,
      impactDate: draft?.impactDate || null,
      impact: draft?.impact || null,
      closureCriteria: draft?.closureCriteria || null,
    }),
    onSuccess: () => {
      setEditing(false);
      setDraft(null);
      setEditError('');
      qc.invalidateQueries({ queryKey: ['issue', id] });
      qc.invalidateQueries({ queryKey: ['issues'] });
    },
    onError: (e: any) => setEditError(e?.response?.data?.error || e.message || 'Failed to save changes.'),
  });

  const addComment = useMutation({
    mutationFn: () => issuesApi.addComment(id!, comment),
    onSuccess: () => {
      setComment('');
      qc.invalidateQueries({ queryKey: ['issue', id] });
    },
  });

  function startEdit() {
    if (issue) { setDraft(issueToDraft(issue)); setEditing(true); setEditError(''); }
  }

  function cancelEdit() { setEditing(false); setDraft(null); setEditError(''); }

  function validateEdit() {
    if (!draft) return 'No changes to save.';
    if (!draft.programId) return 'Program is required.';
    if (!draft.statusProjectId) return 'Project is required.';
    if (!draft.categoryId) return 'Category is required.';
    if (!draft.title.trim()) return 'Title is required.';
    if (!draft.statement.trim()) return 'Statement is required.';
    return '';
  }

  if (isLoading) return <div className="page-loading"><span className="usa-spinner" aria-label="Loading" /> Loading...</div>;
  if (!issue) return <div className="usa-page"><p>Issue not found.</p></div>;

  const DT_STYLE: React.CSSProperties = { fontSize: 12, color: 'var(--usa-base)', textTransform: 'uppercase', fontWeight: 700 };
  const DD_STYLE: React.CSSProperties = { margin: '4px 0 0 0' };

  const escalatedReason = issue.escalatedAt && issue.impactDate && new Date(issue.escalatedAt) >= new Date(issue.impactDate)
    ? 'Impact date passed without resolution'
    : 'Manually converted';

  return (
    <div className="usa-page">

      {/* ── Header ── */}
      <div className="usa-page-header">
        <div style={{ flex: 1 }}>
          <button className="usa-button usa-button--unstyled" onClick={() => navigate('/risks/issues')}
            style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Icon name="arrow_back" size={16} /> Back to Issues
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 className="usa-page-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="report" color="#c9a227" size={24} />
              {issue.title}
            </h1>
            <Pill bg="var(--usa-error)" color="#fff">Issue</Pill>
            <Pill {...RISK_CRITICALITY_STYLES[issue.criticality]}>{RISK_CRITICALITY_LABELS[issue.criticality]}</Pill>
          </div>
          <p className="usa-page-subtitle" style={{ marginTop: 8 }}>
            {issue.riskCode}{issue.spmId ? ` · SPM ${issue.spmId}` : ''}{issue.program ? ` · ${issue.program.name}` : ''}{issue.statusProject ? ` · ${issue.statusProject.name}` : ''}
          </p>
        </div>
        {!editing && (
          <button className="usa-button usa-button--outline" onClick={startEdit} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="edit" size={15} /> Edit Issue
          </button>
        )}
      </div>

      {/* ── Escalation Banner ── */}
      <div style={{ marginBottom: 'var(--space-3)', padding: '12px 16px', borderRadius: 8, background: '#fff0f0', border: '1px solid var(--usa-error-light)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Icon name="report" size={20} color="var(--usa-error)" />
        <div>
          <strong style={{ color: 'var(--usa-error-dark)' }}>Converted to Issue</strong>
          <span style={{ marginLeft: 12, fontSize: 13, color: 'var(--usa-base-dark)' }}>
            {issue.escalatedAt
              ? `${new Date(issue.escalatedAt).toLocaleDateString()} — ${escalatedReason}`
              : escalatedReason}
          </span>
        </div>
      </div>

      {/* ── Edit mode ── */}
      {editing && draft ? (
        <>
          {editError && (
            <div style={{ marginBottom: 'var(--space-3)', padding: '12px 14px', borderRadius: 8, background: '#fff5f5', border: '1px solid var(--usa-error)', color: 'var(--usa-error-dark)', fontWeight: 600 }}>
              {editError}
            </div>
          )}
          <div className="detail-card">
            <h2 style={{ marginTop: 0 }}>Edit Issue</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--space-3)' }}>

              <div>
                <label className="usa-label">Progress</label>
                <select className="usa-select" value={draft.progress} onChange={(e) => setDraft((p) => p && ({ ...p, progress: e.target.value as RiskProgress }))}>
                  {(Object.keys(RISK_PROGRESS_LABELS) as RiskProgress[]).map((v) => (
                    <option key={v} value={v}>{RISK_PROGRESS_LABELS[v]}</option>
                  ))}
                </select>
                {draft.progress !== 'escalated_to_issue' && (
                  <p style={{ fontSize: 12, color: 'var(--usa-warning-dark)', marginTop: 4 }}>
                    Changing progress away from "Converted to Issue" will remove this record from the Issues list.
                  </p>
                )}
              </div>

              <div>
                <label className="usa-label">Criticality</label>
                <select className="usa-select" value={draft.criticality} onChange={(e) => setDraft((p) => p && ({ ...p, criticality: e.target.value as RiskCriticality }))}>
                  {(Object.keys(RISK_CRITICALITY_LABELS) as RiskCriticality[]).map((v) => (
                    <option key={v} value={v}>{RISK_CRITICALITY_LABELS[v]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="usa-label">Program Impacted *</label>
                <select className="usa-select" value={draft.programId}
                  onChange={(e) => setDraft((p) => p && ({ ...p, programId: e.target.value, statusProjectId: '' }))}>
                  <option value="">Select a program</option>
                  {programs.map((prog) => <option key={prog.id} value={prog.id}>{prog.name}</option>)}
                </select>
              </div>

              <div>
                <label className="usa-label">Project Impacted *</label>
                <select className="usa-select" value={draft.statusProjectId}
                  onChange={(e) => setDraft((p) => p && ({ ...p, statusProjectId: e.target.value }))}>
                  <option value="">Select a project</option>
                  {visibleProjects.map((proj) => <option key={proj.id} value={proj.id}>{proj.name}</option>)}
                </select>
              </div>

              <div>
                <label className="usa-label">Category *</label>
                <select className="usa-select" value={draft.categoryId}
                  onChange={(e) => setDraft((p) => p && ({ ...p, categoryId: e.target.value }))}>
                  <option value="">Select a category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="usa-label">SPM ID</label>
                <input className="usa-input" value={draft.spmId}
                  onChange={(e) => setDraft((p) => p && ({ ...p, spmId: e.target.value }))} />
              </div>

              <div>
                <label className="usa-label" style={{ color: 'var(--usa-base-dark)' }}>Risk Owner <span style={{ fontWeight: 400, fontStyle: 'italic' }}>(auto-filled)</span></label>
                <input className="usa-input" value={selectedProgram?.federalOwner || issue.program?.federalOwner || ''} readOnly placeholder="Auto-filled from selected program" style={{ background: 'var(--usa-base-lightest)', color: 'var(--usa-base-dark)', cursor: 'default' }} />
              </div>

              <div>
                <label className="usa-label">Date Identified</label>
                <input className="usa-input" type="date" value={draft.dateIdentified}
                  onChange={(e) => setDraft((p) => p && ({ ...p, dateIdentified: e.target.value }))} />
              </div>

              <div>
                <label className="usa-label">Impact Date</label>
                <input className="usa-input" type="date" value={draft.impactDate}
                  onChange={(e) => setDraft((p) => p && ({ ...p, impactDate: e.target.value }))} />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label className="usa-label">Title *</label>
                <input className="usa-input" value={draft.title}
                  onChange={(e) => setDraft((p) => p && ({ ...p, title: e.target.value }))} />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label className="usa-label">Statement *</label>
                <textarea className="usa-textarea" rows={5} value={draft.statement}
                  onChange={(e) => setDraft((p) => p && ({ ...p, statement: e.target.value }))} />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label className="usa-label">Impact</label>
                <textarea className="usa-textarea" rows={4} value={draft.impact}
                  onChange={(e) => setDraft((p) => p && ({ ...p, impact: e.target.value }))} />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label className="usa-label">Closure Criteria</label>
                <textarea className="usa-textarea" rows={4} value={draft.closureCriteria}
                  onChange={(e) => setDraft((p) => p && ({ ...p, closureCriteria: e.target.value }))} />
              </div>

            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 'var(--space-3)' }}>
            <button className="usa-button usa-button--outline" type="button" onClick={cancelEdit}>Cancel</button>
            <button className="usa-button usa-button--primary" type="button" disabled={updateIssue.isPending}
              onClick={() => { const err = validateEdit(); if (err) { setEditError(err); return; } updateIssue.mutate(); }}>
              {updateIssue.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </>
      ) : (

        /* ── Read mode ── */
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-3)' }}>
          <div className="detail-card">
            <h2 style={{ marginTop: 0 }}>Issue Summary</h2>
            <dl style={{ margin: 0 }}>
              <dt style={DT_STYLE}>Statement</dt>
              <dd style={{ ...DD_STYLE, marginBottom: 16 }}>{issue.statement}</dd>
              <dt style={DT_STYLE}>Impact</dt>
              <dd style={{ ...DD_STYLE, marginBottom: 16 }}>{issue.impact || '—'}</dd>
              <dt style={DT_STYLE}>Closure Criteria</dt>
              <dd style={DD_STYLE}>{issue.closureCriteria || '—'}</dd>
            </dl>
          </div>

          <div className="detail-card">
            <h2 style={{ marginTop: 0 }}>Details</h2>
            <dl style={{ margin: 0, display: 'grid', gap: 12 }}>
              <div><dt style={DT_STYLE}>Category</dt><dd style={DD_STYLE}>{issue.category?.name || '—'}</dd></div>
              <div><dt style={DT_STYLE}>Risk Owner</dt><dd style={DD_STYLE}>{issue.program?.federalOwner || '—'}</dd></div>
              <div><dt style={DT_STYLE}>Submitter</dt><dd style={DD_STYLE}>{issue.submitter?.displayName || '—'}</dd></div>
              <div><dt style={DT_STYLE}>Date Identified</dt><dd style={DD_STYLE}>{issue.dateIdentified ? new Date(issue.dateIdentified).toLocaleDateString() : '—'}</dd></div>
              <div><dt style={DT_STYLE}>Impact Date</dt><dd style={DD_STYLE}>{issue.impactDate ? new Date(issue.impactDate).toLocaleDateString() : '—'}</dd></div>
              <div><dt style={DT_STYLE}>Converted On</dt><dd style={DD_STYLE}>{issue.escalatedAt ? new Date(issue.escalatedAt).toLocaleDateString() : '—'}</dd></div>
            </dl>
          </div>
        </div>
      )}

      {/* ── Mitigation Plan ── */}
      <div className="detail-card" style={{ marginTop: 'var(--space-3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h2 style={{ margin: 0 }}>Mitigation Plan</h2>
            {issue.impactDate && (
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--usa-base-dark)' }}>
                Action steps must be due on or before the impact date: <strong>{new Date(issue.impactDate).toLocaleDateString()}</strong>
              </p>
            )}
          </div>
          <button className="usa-button usa-button--success usa-button--sm" onClick={() => setAddingAction(true)} disabled={addingAction}>
            <Icon name="add" size={14} /> Add Action Step
          </button>
        </div>

        {(issue.mitigationActions && issue.mitigationActions.length > 0) || addingAction ? (
          <table className="usa-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: 60, textAlign: 'center' }}>Complete</th>
                <th>Description</th>
                <th style={{ whiteSpace: 'nowrap' }}>Due Date</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {issue.mitigationActions?.map((action) => (
                <MitigationRow key={action.id} action={action} impactDate={issue.impactDate} issueId={issue.id}
                  onSaved={() => qc.invalidateQueries({ queryKey: ['issue', id] })} />
              ))}
              {addingAction && (
                <AddActionRow issueId={issue.id} impactDate={issue.impactDate}
                  onSaved={() => { setAddingAction(false); qc.invalidateQueries({ queryKey: ['issue', id] }); }}
                  onCancel={() => setAddingAction(false)} />
              )}
            </tbody>
          </table>
        ) : (
          <p style={{ margin: 0, color: 'var(--usa-base-dark)' }}>No mitigation actions recorded yet.</p>
        )}
      </div>

      {/* ── Comments ── */}
      <div className="detail-card" style={{ marginTop: 'var(--space-3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Comments</h2>
          <span style={{ fontSize: 13, color: 'var(--usa-base-dark)' }}>{issue.comments?.length || 0} comment{issue.comments?.length === 1 ? '' : 's'}</span>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="usa-label">Add Comment</label>
          <textarea className="usa-textarea" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add context, resolution steps, or a status note" />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="usa-button usa-button--outline usa-button--sm" onClick={() => addComment.mutate()} disabled={addComment.isPending || !comment.trim()}>
              {addComment.isPending ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        </div>

        {issue.comments && issue.comments.length > 0 ? (
          <div style={{ display: 'grid', gap: 12 }}>
            {issue.comments.map((entry) => (
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
