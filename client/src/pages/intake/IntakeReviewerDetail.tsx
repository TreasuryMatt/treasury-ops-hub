import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { intakeApi } from '../../api/intake';
import { programsApi } from '../../api/programs';
import { IntakeDetermination } from '../../types';
import { Icon } from '../../components/Icon';
import { IntakeStatusPill } from '../../components/IntakeStatusPill';

export function IntakeReviewerDetail() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const [determination, setDetermination] = useState<IntakeDetermination>('backlog');
  const [notes, setNotes] = useState('');
  const [denialReason, setDenialReason] = useState('');
  const [programId, setProgramId] = useState('');

  const { data: submission, isLoading } = useQuery({
    queryKey: ['intake', 'submission', id],
    queryFn: () => intakeApi.get(id),
  });
  const { data: versions = [] } = useQuery({
    queryKey: ['intake', 'versions', id],
    queryFn: () => intakeApi.listVersions(id),
  });
  const { data: programs = [] } = useQuery({
    queryKey: ['programs'],
    queryFn: programsApi.list,
  });

  const refreshAll = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['intake', 'submission', id] }),
      qc.invalidateQueries({ queryKey: ['intake', 'review'] }),
      qc.invalidateQueries({ queryKey: ['intake', 'dashboard'] }),
      qc.invalidateQueries({ queryKey: ['intake', 'mine'] }),
    ]);
  };

  const scoreMutation = useMutation({
    mutationFn: () => intakeApi.score(id),
    onSuccess: refreshAll,
  });

  const determineMutation = useMutation({
    mutationFn: () => intakeApi.setDetermination(id, { determination, notes, denialReason, programId }),
    onSuccess: refreshAll,
  });

  const designReviewMutation = useMutation({
    mutationFn: () => intakeApi.generateDesignReview(id),
    onSuccess: refreshAll,
  });

  const formData = useMemo(() => ((submission?.currentVersion?.formData || {}) as Record<string, any>), [submission]);

  useEffect(() => {
    if (!submission) return;
    setDetermination(submission.determination || 'backlog');
    setNotes(submission.determinationNotes || '');
    setDenialReason(submission.denialReason || '');
  }, [submission]);

  if (isLoading || !submission) {
    return <div className="page-loading"><span className="usa-spinner" aria-label="Loading" /> Loading...</div>;
  }

  return (
    <div className="usa-page">
      <div className="usa-page-header">
        <div>
          <Link to="/intake/review/submissions" className="usa-button usa-button--unstyled">← Back to queue</Link>
          <h1 className="usa-page-title" style={{ marginTop: 8 }}>{submission.title}</h1>
          <p className="usa-page-subtitle">Submitted by {submission.submitter?.displayName || 'Unknown'} on {new Date(submission.createdAt).toLocaleString()}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(320px, 1fr)', gap: 20 }}>
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="detail-card">
            <h3 style={{ marginTop: 0 }}>Request details</h3>
            {Object.entries(formData).map(([key, value]) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--usa-base)' }}>{key}</div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{String(value || '—')}</div>
              </div>
            ))}
          </div>

          <div className="detail-card">
            <h3 style={{ marginTop: 0 }}>Supporting documents</h3>
            {submission.documents?.length ? submission.documents.map((doc) => (
              <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--usa-base-lighter)' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{doc.originalName}</div>
                  <div style={{ fontSize: 12, color: 'var(--usa-base)' }}>{Math.round(doc.sizeBytes / 1024)} KB</div>
                </div>
                <a className="usa-button usa-button--unstyled" href={intakeApi.documentDownloadUrl(id, doc.id)}>Download</a>
              </div>
            )) : <span style={{ color: 'var(--usa-base)' }}>No documents uploaded.</span>}
          </div>

          <div className="detail-card">
            <h3 style={{ marginTop: 0 }}>Version history</h3>
            <div style={{ display: 'grid', gap: 8 }}>
              {versions.map((version) => (
                <div key={version.id} style={{ padding: 10, border: '1px solid var(--usa-base-lighter)', borderRadius: 8 }}>
                  <strong>Version {version.versionNumber}</strong>
                  <div style={{ fontSize: 12, color: 'var(--usa-base)' }}>
                    {new Date(version.createdAt).toLocaleString()} by {version.createdBy?.displayName || 'Unknown'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          <div className="detail-card">
            <h3 style={{ marginTop: 0 }}>Review summary</h3>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 8, marginBottom: 10 }}>
              <strong>Status:</strong>
              <IntakeStatusPill status={submission.status} />
            </div>
            <div><strong>AI score:</strong> {submission.aiScore ?? 'Not scored'}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 8, marginTop: 10 }}>
              <strong>Determination:</strong>
              <IntakeStatusPill status={submission.determination || 'pending'} />
            </div>
            {submission.linkedProject && <div><strong>Linked project:</strong> {submission.linkedProject.name}</div>}
            {submission.designReviewGeneratedAt && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--usa-base)' }}>
                Design review generated {new Date(submission.designReviewGeneratedAt).toLocaleString()}
              </div>
            )}
          </div>

          <div className="detail-card">
            <h3 style={{ marginTop: 0 }}>AI actions</h3>
            <button className="usa-button usa-button--outline" disabled={scoreMutation.isPending} onClick={() => scoreMutation.mutate()}>
              {scoreMutation.isPending ? 'Scoring...' : 'Run AI score'}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
              <button className="usa-button usa-button--outline" disabled={designReviewMutation.isPending || submission.status !== 'approved'} onClick={() => designReviewMutation.mutate()}>
                {designReviewMutation.isPending ? 'Generating...' : 'Generate design review'}
              </button>
              {submission.designReviewGeneratedAt && (
                <a
                  className="usa-button usa-button--outline"
                  href={intakeApi.designReviewDownloadUrl(id)}
                  aria-label="Download design review"
                  title="Download design review"
                  style={{
                    minWidth: 40,
                    width: 40,
                    height: 40,
                    padding: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="download" size={18} />
                </a>
              )}
            </div>
          </div>

          <div className="detail-card">
            <h3 style={{ marginTop: 0 }}>Record determination</h3>
            {submission.linkedProject && (
              <div className="usa-alert usa-alert--info" style={{ marginBottom: 16 }}>
                This submission already created a linked project. Changing the determination will update the intake record and preserve the existing project link.
              </div>
            )}
            <div className="usa-form-group">
              <label className="usa-label" htmlFor="determination">Decision</label>
              <select id="determination" className="usa-select" value={determination} onChange={(e) => setDetermination(e.target.value as IntakeDetermination)}>
                <option value="backlog">Backlog / Non-Critical</option>
                <option value="denied">Denied</option>
                <option value="approved">Approved</option>
              </select>
            </div>

            <div className="usa-form-group">
              <label className="usa-label" htmlFor="notes">Reviewer notes</label>
              <textarea id="notes" className="usa-textarea" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            {determination === 'denied' && (
              <div className="usa-form-group">
                <label className="usa-label" htmlFor="denialReason">Denial reason</label>
                <textarea id="denialReason" className="usa-textarea" rows={4} value={denialReason} onChange={(e) => setDenialReason(e.target.value)} />
              </div>
            )}

            {determination === 'approved' && (
              <div className="usa-form-group">
                <label className="usa-label" htmlFor="programId">Program for new project</label>
                <select id="programId" className="usa-select" value={programId} onChange={(e) => setProgramId(e.target.value)}>
                  <option value="">Let system choose default</option>
                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>{program.name}</option>
                  ))}
                </select>
              </div>
            )}

            <button className="usa-button usa-button--primary" disabled={determineMutation.isPending || (determination === 'denied' && !denialReason.trim())} onClick={() => determineMutation.mutate()}>
              {determineMutation.isPending ? 'Saving...' : submission.determination ? 'Update determination' : 'Save determination'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
