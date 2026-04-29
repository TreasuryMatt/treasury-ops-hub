import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { intakeApi } from '../../api/intake';
import { IntakeSubmission } from '../../types';
import { IntakeStatusPill } from '../../components/IntakeStatusPill';
import { Icon } from '../../components/Icon';
import { Toast, useToast } from '../../components/Toast';

type IntakeFormState = {
  title: string;
  problemStatement: string;
  businessGoals: string;
  costSavings: string;
  desiredTimeline: string;
  stakeholders: string;
  technicalRequirements: string;
  proposedSolution: string;
  definitionOfDone: string;
  risksConstraints: string;
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
  definitionOfDone: '',
  risksConstraints: '',
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
      definitionOfDone: form.definitionOfDone,
      risksConstraints: form.risksConstraints,
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
    definitionOfDone: formData.definitionOfDone || '',
    risksConstraints: formData.risksConstraints || '',
    priority: formData.priority || '',
  };
}

function FieldTip({ tip }: { tip: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="field-tip">
      <button
        type="button"
        className="field-tip__btn"
        aria-label="Field guidance"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShow((v) => !v); }}
      >
        <svg viewBox="0 0 20 20" width="15" height="15" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm1-11a1 1 0 1 0-2 0v4a1 1 0 1 0 2 0V7zm-1 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" clipRule="evenodd" />
        </svg>
      </button>
      {show && <div className="field-tip__tooltip" role="tooltip">{tip}</div>}
    </span>
  );
}

export function IntakeSubmissionForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const { toast, show: showToast, dismiss: dismissToast } = useToast();
  const [form, setForm] = useState<IntakeFormState>(EMPTY_FORM);
  const [assistantPrompt, setAssistantPrompt] = useState('');
  const [assistantReply, setAssistantReply] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  useEffect(() => {
    const flash = (location.state as any)?.flash as string | undefined;
    if (flash) {
      showToast(flash);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.key]);

  const canEdit = useMemo(
    () => isNew || submission?.status === 'draft',
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
      if (isNew) {
        navigate(`/intake/${saved.id}`, {
          state: { flash: 'Draft saved. You can now attach supporting documents.' },
        });
      } else {
        showToast('Draft saved.');
      }
    },
    onError: () => showToast('Failed to save draft. Please try again.', 'error'),
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
      navigate(`/intake/${saved.id}`, {
        state: { flash: 'Submitted for review. You\'ll be notified when a determination is made.' },
      });
    },
    onError: () => showToast('Failed to submit. Please try again.', 'error'),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => intakeApi.uploadDocument(id as string, file),
    onSuccess: async () => {
      setUploadError('');
      await qc.invalidateQueries({ queryKey: ['intake', 'submission', id] });
    },
    onError: () => setUploadError('Upload failed. Please check the file type and size and try again.'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => intakeApi.deleteDraft(id as string),
    onSuccess: () => navigate('/intake', { state: { flash: 'Draft deleted.' } }),
    onError: () => { setConfirmDelete(false); showToast('Failed to delete draft. Please try again.', 'error'); },
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
          <h1 className="usa-page-title" style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="summarize" color="#2e8b57" size={24} />
            {isNew ? 'New intake submission' : form.title || 'Edit submission'}
          </h1>
          <p className="usa-page-subtitle">Capture enough detail for reviewers to assess feasibility and leadership priority.</p>
        </div>
      </div>

      {!canEdit && (
        <div className="usa-alert usa-alert--info" style={{ marginBottom: 16 }}>
          This submission is read-only. Once submitted, it cannot be edited.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(320px, 1fr)', gap: 20 }}>
        <form className="resource-form" onSubmit={(e) => e.preventDefault()}>
          <div className="usa-form-group">
            <label className="usa-label" htmlFor="title">
              Submission title <span aria-hidden="true" style={{ color: 'var(--usa-error)' }}>*</span>
              <FieldTip tip="Use a clear, specific name that signals the project's purpose — e.g., 'Automated AP Reconciliation' rather than 'Finance Tool Improvement'. Strong titles help leadership quickly assess scope and priority." />
            </label>
            <input
              id="title"
              className="usa-input"
              value={form.title}
              disabled={!canEdit}
              required
              aria-required="true"
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Short name for the request"
            />
          </div>

          <div className="usa-form-group">
            <label className="usa-label" htmlFor="problemStatement">
              Problem statement
              <FieldTip tip="Describe the specific, quantifiable pain point: who is affected, how often, and what it costs in time or money. Reviewers prioritize problems with clear evidence over general inefficiency complaints." />
            </label>
            <textarea id="problemStatement" className="usa-textarea" rows={5} disabled={!canEdit} value={form.problemStatement} onChange={(e) => setForm((f) => ({ ...f, problemStatement: e.target.value }))} />
          </div>

          <div className="form-grid">
            <div className="usa-form-group">
              <label className="usa-label" htmlFor="businessGoals">
                Business goals
                <FieldTip tip="Link each goal directly to a Treasury strategic objective or an OIG/GAO finding. Requests aligned with existing agency priorities and mandates are far more likely to be funded." />
              </label>
              <textarea id="businessGoals" className="usa-textarea" rows={4} disabled={!canEdit} value={form.businessGoals} onChange={(e) => setForm((f) => ({ ...f, businessGoals: e.target.value }))} />
            </div>
            <div className="usa-form-group">
              <label className="usa-label" htmlFor="costSavings">
                Expected impact / savings
                <FieldTip tip="Provide hard numbers — estimated FTE hours saved per year, error rate reduction, or dollar savings. Requests with measurable ROI receive higher scores. Even rough estimates significantly strengthen your case." />
              </label>
              <textarea id="costSavings" className="usa-textarea" rows={4} disabled={!canEdit} value={form.costSavings} onChange={(e) => setForm((f) => ({ ...f, costSavings: e.target.value }))} />
            </div>
            <div className="usa-form-group">
              <label className="usa-label" htmlFor="desiredTimeline">
                Desired timeline
                <FieldTip tip="Align your timeline to a budget cycle, compliance deadline, or open enrollment period where possible. Requests with external urgency drivers (e.g., 'FISMA audit Q4 FY26') receive higher prioritization." />
              </label>
              <input id="desiredTimeline" className="usa-input" disabled={!canEdit} value={form.desiredTimeline} onChange={(e) => setForm((f) => ({ ...f, desiredTimeline: e.target.value }))} placeholder="e.g. Q3 FY26 or 6 weeks" />
            </div>
            <div className="usa-form-group">
              <label className="usa-label" htmlFor="priority">
                Priority
                <FieldTip tip="Be honest — overstating priority reduces credibility with reviewers. Reserve 'Critical' for items tied to a legal obligation, active audit finding, or imminent system failure." />
              </label>
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
            <label className="usa-label" htmlFor="stakeholders">
              Stakeholders
              <FieldTip tip="List sponsors by name and title, including the bureau chief or SES-level official who owns the outcome. Requests without identified executive sponsors routinely stall in approval." />
            </label>
            <textarea id="stakeholders" className="usa-textarea" rows={4} disabled={!canEdit} value={form.stakeholders} onChange={(e) => setForm((f) => ({ ...f, stakeholders: e.target.value }))} />
          </div>

          <div className="usa-form-group">
            <label className="usa-label" htmlFor="technicalRequirements">
              Technical / functional requirements
              <FieldTip tip="Describe what the system must do, not how to build it. Include integration points, data sources, user roles, and expected volume. Missing this section is the #1 reason requests return for revision." />
            </label>
            <textarea id="technicalRequirements" className="usa-textarea" rows={6} disabled={!canEdit} value={form.technicalRequirements} onChange={(e) => setForm((f) => ({ ...f, technicalRequirements: e.target.value }))} />
          </div>

          <div className="usa-form-group">
            <label className="usa-label" htmlFor="proposedSolution">
              Existing ideas or proposed solution
              <FieldTip tip="If you have a vendor in mind or a preferred technology, state it here with your rationale. Reviewers appreciate informed preferences — also note if you're open to alternatives, since flexibility accelerates approval." />
            </label>
            <textarea id="proposedSolution" className="usa-textarea" rows={5} disabled={!canEdit} value={form.proposedSolution} onChange={(e) => setForm((f) => ({ ...f, proposedSolution: e.target.value }))} />
          </div>

          <div className="usa-form-group">
            <label className="usa-label" htmlFor="definitionOfDone">
              Definition of done
              <FieldTip tip="Define the minimum acceptable outcome: what will users be able to do that they cannot do today? Clear acceptance criteria allow reviewers to scope the effort accurately and set realistic expectations." />
            </label>
            <textarea id="definitionOfDone" className="usa-textarea" rows={4} disabled={!canEdit} value={form.definitionOfDone} onChange={(e) => setForm((f) => ({ ...f, definitionOfDone: e.target.value }))} placeholder="What does success look like? What can users do when this is complete?" />
          </div>

          <div className="usa-form-group">
            <label className="usa-label" htmlFor="risksConstraints">
              Risks / constraints
              <FieldTip tip="Surface known blockers early — budget cycles, legacy system dependencies, procurement lead times, staffing gaps, or security requirements. Reviewers trust submitters who identify risks proactively over those who surface them mid-project." />
            </label>
            <textarea id="risksConstraints" className="usa-textarea" rows={4} disabled={!canEdit} value={form.risksConstraints} onChange={(e) => setForm((f) => ({ ...f, risksConstraints: e.target.value }))} placeholder="Known blockers, dependencies, or constraints that may affect delivery" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
            <button className="usa-button usa-button--outline" disabled={!canEdit || saveMutation.isPending || !form.title.trim()} onClick={() => saveMutation.mutate()}>
              {saveMutation.isPending ? 'Saving...' : 'Save draft'}
            </button>
            <button className="usa-button usa-button--success" disabled={!canEdit || submitMutation.isPending || !form.title.trim()} onClick={() => submitMutation.mutate()}>
              {submitMutation.isPending ? 'Submitting...' : 'Submit for review'}
            </button>
            {!isNew && submission?.status === 'draft' && (
              confirmDelete ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                  <span style={{ fontSize: 13, color: 'var(--usa-base-dark)' }}>Delete this draft?</span>
                  <button className="usa-button usa-button--danger usa-button--sm" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
                    {deleteMutation.isPending ? 'Deleting...' : 'Yes, delete'}
                  </button>
                  <button className="usa-button usa-button--secondary usa-button--sm" onClick={() => setConfirmDelete(false)}>
                    Cancel
                  </button>
                </span>
              ) : (
                <button className="usa-button usa-button--unstyled" style={{ marginLeft: 'auto', color: 'var(--usa-error)', fontSize: 13 }} onClick={() => setConfirmDelete(true)}>
                  Delete draft
                </button>
              )
            )}
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

          {isNew && (
            <div className="usa-alert usa-alert--info" style={{ padding: '12px 16px', borderRadius: 8 }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--usa-ink)' }}>
                <strong>Save a draft</strong> to attach supporting documents and track review status.
              </p>
            </div>
          )}

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
      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}
