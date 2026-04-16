import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { intakeApi } from '../../api/intake';
import { IntakeSubmission } from '../../types';
import { IntakeStatusPill } from '../../components/IntakeStatusPill';

type IntakeFormState = {
  title: string;
  problemStatement: string;
  businessGoals: string;
  costSavings: string;
  desiredTimeline: string;
  stakeholders: string;
  technicalRequirements: string;
  proposedSolution: string;
  priority: string;
};

const EMPTY_FORM: IntakeFormState = {
  title: '',
  problemStatement: '',
  businessGoals: '',
  costSavings: '',
  desiredTimeline: '',
  stakeholders: '',
  technicalRequirements: '',
  proposedSolution: '',
  priority: '',
};

function toPayload(form: IntakeFormState) {
  return {
    title: form.title,
    formData: {
      problemStatement: form.problemStatement,
      businessGoals: form.businessGoals,
      costSavings: form.costSavings,
      desiredTimeline: form.desiredTimeline,
      stakeholders: form.stakeholders,
      technicalRequirements: form.technicalRequirements,
      proposedSolution: form.proposedSolution,
      priority: form.priority,
    },
  };
}

function fromSubmission(submission?: IntakeSubmission | null): IntakeFormState {
  const formData = (submission?.currentVersion?.formData || {}) as Record<string, any>;
  return {
    title: submission?.title || '',
    problemStatement: formData.problemStatement || '',
    businessGoals: formData.businessGoals || '',
    costSavings: formData.costSavings || '',
    desiredTimeline: formData.desiredTimeline || '',
    stakeholders: formData.stakeholders || '',
    technicalRequirements: formData.technicalRequirements || '',
    proposedSolution: formData.proposedSolution || '',
    priority: formData.priority || '',
  };
}

export function IntakeSubmissionForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState<IntakeFormState>(EMPTY_FORM);
  const [assistantPrompt, setAssistantPrompt] = useState('');
  const [assistantReply, setAssistantReply] = useState('');
  const [uploadError, setUploadError] = useState('');

  const isNew = !id || id === 'new';
  const { data: submission, isLoading } = useQuery({
    queryKey: ['intake', 'submission', id],
    queryFn: () => intakeApi.get(id as string),
    enabled: !isNew,
  });

  useEffect(() => {
    if (!isNew && submission) {
      setForm(fromSubmission(submission));
    }
  }, [isNew, submission]);

  const canEdit = useMemo(
    () => isNew || submission?.status === 'draft' || submission?.status === 'submitted' || submission?.status === 'under_review',
    [isNew, submission]
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = toPayload(form);
      return isNew ? intakeApi.createDraft(payload) : intakeApi.update(id as string, payload);
    },
    onSuccess: async (saved) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['intake', 'mine'] }),
        qc.invalidateQueries({ queryKey: ['intake', 'submission', saved.id] }),
      ]);
      if (isNew) navigate(`/intake/${saved.id}`);
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const target = isNew ? await intakeApi.createDraft(toPayload(form)) : await intakeApi.update(id as string, toPayload(form));
      return intakeApi.submit(target.id);
    },
    onSuccess: async (saved) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['intake', 'mine'] }),
        qc.invalidateQueries({ queryKey: ['intake', 'submission', saved.id] }),
      ]);
      navigate(`/intake/${saved.id}`);
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => intakeApi.uploadDocument(id as string, file),
    onSuccess: async () => {
      setUploadError('');
      await qc.invalidateQueries({ queryKey: ['intake', 'submission', id] });
    },
    onError: () => setUploadError('Upload failed. Please check the file type and size and try again.'),
  });

  const assistMutation = useMutation({
    mutationFn: () => intakeApi.assist({ formData: toPayload(form).formData, userMessage: assistantPrompt }),
    onSuccess: (data) => setAssistantReply(data.reply),
  });

  if (!isNew && isLoading) {
    return <div className="page-loading"><span className="usa-spinner" aria-label="Loading" /> Loading...</div>;
  }

  return (
    <div className="usa-page">
      <div className="usa-page-header">
        <div>
          <Link to="/intake" className="usa-button usa-button--unstyled">← Back to my submissions</Link>
          <h1 className="usa-page-title" style={{ marginTop: 8 }}>{isNew ? 'New intake submission' : form.title || 'Edit submission'}</h1>
          <p className="usa-page-subtitle">Capture enough detail for reviewers to assess feasibility and leadership priority.</p>
        </div>
      </div>

      {!canEdit && (
        <div className="usa-alert usa-alert--info" style={{ marginBottom: 16 }}>
          This submission is no longer editable because a determination has been recorded.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(320px, 1fr)', gap: 20 }}>
        <form className="resource-form" onSubmit={(e) => e.preventDefault()}>
          <div className="usa-form-group">
            <label className="usa-label" htmlFor="title">Submission title</label>
            <input
              id="title"
              className="usa-input"
              value={form.title}
              disabled={!canEdit}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Short name for the request"
            />
          </div>

          <div className="usa-form-group">
            <label className="usa-label" htmlFor="problemStatement">Problem statement</label>
            <textarea id="problemStatement" className="usa-textarea" rows={5} disabled={!canEdit} value={form.problemStatement} onChange={(e) => setForm((f) => ({ ...f, problemStatement: e.target.value }))} />
          </div>

          <div className="form-grid">
            <div className="usa-form-group">
              <label className="usa-label" htmlFor="businessGoals">Business goals</label>
              <textarea id="businessGoals" className="usa-textarea" rows={4} disabled={!canEdit} value={form.businessGoals} onChange={(e) => setForm((f) => ({ ...f, businessGoals: e.target.value }))} />
            </div>
            <div className="usa-form-group">
              <label className="usa-label" htmlFor="costSavings">Expected impact / savings</label>
              <textarea id="costSavings" className="usa-textarea" rows={4} disabled={!canEdit} value={form.costSavings} onChange={(e) => setForm((f) => ({ ...f, costSavings: e.target.value }))} />
            </div>
            <div className="usa-form-group">
              <label className="usa-label" htmlFor="desiredTimeline">Desired timeline</label>
              <input id="desiredTimeline" className="usa-input" disabled={!canEdit} value={form.desiredTimeline} onChange={(e) => setForm((f) => ({ ...f, desiredTimeline: e.target.value }))} placeholder="e.g. Q3 FY26 or 6 weeks" />
            </div>
            <div className="usa-form-group">
              <label className="usa-label" htmlFor="priority">Priority</label>
              <select id="priority" className="usa-select" disabled={!canEdit} value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
                <option value="">Select priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="usa-form-group">
            <label className="usa-label" htmlFor="stakeholders">Stakeholders</label>
            <textarea id="stakeholders" className="usa-textarea" rows={4} disabled={!canEdit} value={form.stakeholders} onChange={(e) => setForm((f) => ({ ...f, stakeholders: e.target.value }))} />
          </div>

          <div className="usa-form-group">
            <label className="usa-label" htmlFor="technicalRequirements">Technical / functional requirements</label>
            <textarea id="technicalRequirements" className="usa-textarea" rows={6} disabled={!canEdit} value={form.technicalRequirements} onChange={(e) => setForm((f) => ({ ...f, technicalRequirements: e.target.value }))} />
          </div>

          <div className="usa-form-group">
            <label className="usa-label" htmlFor="proposedSolution">Existing ideas or proposed solution</label>
            <textarea id="proposedSolution" className="usa-textarea" rows={5} disabled={!canEdit} value={form.proposedSolution} onChange={(e) => setForm((f) => ({ ...f, proposedSolution: e.target.value }))} />
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button className="usa-button" disabled={!canEdit || saveMutation.isPending || !form.title.trim()} onClick={() => saveMutation.mutate()}>
              {saveMutation.isPending ? 'Saving...' : 'Save draft'}
            </button>
            <button className="usa-button usa-button--secondary" disabled={!canEdit || submitMutation.isPending || !form.title.trim()} onClick={() => submitMutation.mutate()}>
              {submitMutation.isPending ? 'Submitting...' : 'Submit for review'}
            </button>
          </div>
        </form>

        <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          <div className="detail-card">
            <h3 style={{ marginTop: 0 }}>AI submission coach</h3>
            <p style={{ color: 'var(--usa-base-dark)' }}>Ask for help strengthening your justification or clarifying requirements.</p>
            <textarea className="usa-textarea" rows={4} value={assistantPrompt} onChange={(e) => setAssistantPrompt(e.target.value)} placeholder="How can I improve this request before submitting?" />
            <button className="usa-button usa-button--outline" style={{ marginTop: 12 }} disabled={!assistantPrompt.trim() || assistMutation.isPending} onClick={() => assistMutation.mutate()}>
              {assistMutation.isPending ? 'Thinking...' : 'Ask assistant'}
            </button>
            {assistantReply && (
              <div style={{ marginTop: 12, padding: 12, background: 'var(--usa-base-lightest)', borderRadius: 8, whiteSpace: 'pre-wrap' }}>
                {assistantReply}
              </div>
            )}
          </div>

          {!isNew && (
            <>
              <div className="detail-card">
                <h3 style={{ marginTop: 0 }}>Supporting documents</h3>
                {canEdit && (
                  <input
                    className="usa-file-input"
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadMutation.mutate(file);
                    }}
                  />
                )}
                {uploadError && <div className="usa-alert usa-alert--error" style={{ marginTop: 12 }}>{uploadError}</div>}
                <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                  {submission?.documents?.length ? submission.documents.map((doc) => (
                    <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: 10, border: '1px solid var(--usa-base-lighter)', borderRadius: 8 }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{doc.originalName}</div>
                        <div style={{ fontSize: 12, color: 'var(--usa-base)' }}>{Math.round(doc.sizeBytes / 1024)} KB</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <a className="usa-button usa-button--unstyled" href={intakeApi.documentDownloadUrl(id as string, doc.id)}>Download</a>
                        {canEdit && <button className="usa-button usa-button--unstyled" onClick={() => intakeApi.deleteDocument(id as string, doc.id).then(() => qc.invalidateQueries({ queryKey: ['intake', 'submission', id] }))}>Delete</button>}
                      </div>
                    </div>
                  )) : <span style={{ color: 'var(--usa-base)' }}>No files uploaded yet.</span>}
                </div>
              </div>

              <div className="detail-card">
                <h3 style={{ marginTop: 0 }}>Current status</h3>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 8, marginBottom: 10 }}>
                  <strong>Status:</strong>
                  <IntakeStatusPill status={submission?.status || 'pending'} />
                </div>
                <div><strong>Review:</strong> {submission?.aiScore ?? 'Not yet scored'}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 8, marginTop: 10 }}>
                  <strong>Determination:</strong>
                  <IntakeStatusPill status={submission?.determination || 'pending'} />
                </div>
                {submission?.denialReason && <div><strong>Denial reason:</strong> {submission.denialReason}</div>}
                {submission?.determinationNotes && <div><strong>Notes:</strong> {submission.determinationNotes}</div>}
                {submission?.linkedProject && <div><strong>Created project:</strong> {submission.linkedProject.name}</div>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
