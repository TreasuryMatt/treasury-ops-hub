import React, { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { programsApi } from '../../api/programs';
import { statusProjectsApi } from '../../api/statusProjects';
import { adminApi } from '../../api/admin';
import { risksApi } from '../../api/risks';
import { useAuth } from '../../context/AuthContext';
import { Icon } from '../../components/Icon';
import { Program, RiskActionStatus, RiskCategory, RiskCriticality, RiskProgress, StatusProject } from '../../types';
import { RISK_ACTION_STATUS_LABELS, RISK_CRITICALITY_LABELS, RISK_PROGRESS_LABELS } from './riskUi';

type MitigationActionDraft = {
  title: string;
  dueDate: string;
  status: RiskActionStatus;
};

export function RiskForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [errorMessage, setErrorMessage] = useState('');
  const [form, setForm] = useState({
    progress: 'open' as RiskProgress,
    programId: '',
    statusProjectId: '',
    categoryId: '',
    spmId: '',
    title: '',
    statement: '',
    criticality: 'moderate' as RiskCriticality,
    dateIdentified: '',
    impact: '',
    impactDate: '',
    closureCriteria: '',
  });
  const [mitigationActions, setMitigationActions] = useState<MitigationActionDraft[]>([]);

  const { data: programs = [] } = useQuery<Program[]>({
    queryKey: ['programs'],
    queryFn: programsApi.list,
  });
  const { data: projects = [] } = useQuery<StatusProject[]>({
    queryKey: ['status-projects', 'risk-form'],
    queryFn: () => statusProjectsApi.list({}),
  });
  const { data: categories = [] } = useQuery<RiskCategory[]>({
    queryKey: ['risk-categories'],
    queryFn: adminApi.riskCategories,
  });

  const visibleProjects = useMemo(
    () => projects.filter((project) => !form.programId || project.programId === form.programId),
    [projects, form.programId]
  );

  const selectedProgram = programs.find((program) => program.id === form.programId);

  const createRisk = useMutation({
    mutationFn: () =>
      risksApi.create({
        ...form,
        mitigationActions,
      }),
    onSuccess: (risk) => navigate(`/risks/risks/${risk.id}`),
    onError: (error) => {
      const axiosError = error as AxiosError<{ error?: string; message?: string }>;
      setErrorMessage(
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        axiosError.message ||
        'Unable to create the risk right now.'
      );
    },
  });

  function updateMitigationAction<K extends keyof MitigationActionDraft>(index: number, key: K, value: MitigationActionDraft[K]) {
    setMitigationActions((prev) => prev.map((action, i) => (i === index ? { ...action, [key]: value } : action)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage('');

    if (!form.programId || !form.statusProjectId || !form.categoryId || !form.title.trim() || !form.statement.trim()) {
      setErrorMessage('Program, project, category, title, and statement are required.');
      return;
    }

    createRisk.mutate();
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
          <h1 className="usa-page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="shield" color="#c9a227" size={26} />
            Create Risk
          </h1>
          <p className="usa-page-subtitle">Log a new risk, attach it to a program and project, and capture the initial mitigation path.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
      <div className="detail-card">
        {errorMessage && (
          <div
            style={{
              marginBottom: 16,
              padding: '12px 14px',
              borderRadius: 8,
              background: '#fff5f5',
              border: '1px solid var(--usa-error)',
              color: 'var(--usa-error-dark)',
              fontWeight: 600,
            }}
          >
            {errorMessage}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--space-3)' }}>
          <div>
            <label className="usa-label">Progress</label>
            <select className="usa-select" value={form.progress} onChange={(e) => setForm((prev) => ({ ...prev, progress: e.target.value as RiskProgress }))}>
              {(Object.keys(RISK_PROGRESS_LABELS) as RiskProgress[]).map((progress) => (
                <option key={progress} value={progress}>{RISK_PROGRESS_LABELS[progress]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="usa-label">SPM ID</label>
            <input className="usa-input" value={form.spmId} onChange={(e) => setForm((prev) => ({ ...prev, spmId: e.target.value }))} />
          </div>

          <div>
            <label className="usa-label">Program Impacted *</label>
            <select className="usa-select" value={form.programId} onChange={(e) => setForm((prev) => ({ ...prev, programId: e.target.value, statusProjectId: '' }))}>
              <option value="">Select a program</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>{program.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="usa-label">Project Impacted *</label>
            <select className="usa-select" value={form.statusProjectId} onChange={(e) => setForm((prev) => ({ ...prev, statusProjectId: e.target.value }))}>
              <option value="">Select a project</option>
              {visibleProjects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="usa-label">Category *</label>
            <select className="usa-select" value={form.categoryId} onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value }))}>
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="usa-label">Criticality</label>
            <select className="usa-select" value={form.criticality} onChange={(e) => setForm((prev) => ({ ...prev, criticality: e.target.value as RiskCriticality }))}>
              {(Object.keys(RISK_CRITICALITY_LABELS) as RiskCriticality[]).map((criticality) => (
                <option key={criticality} value={criticality}>{RISK_CRITICALITY_LABELS[criticality]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="usa-label" style={{ color: 'var(--usa-base-dark)' }}>Submitter <span style={{ fontWeight: 400, fontStyle: 'italic' }}>(auto-filled)</span></label>
            <input className="usa-input" value={user?.displayName || ''} readOnly style={{ background: 'var(--usa-base-lightest)', color: 'var(--usa-base-dark)', cursor: 'default' }} />
          </div>

          <div>
            <label className="usa-label" style={{ color: 'var(--usa-base-dark)' }}>Program Owner <span style={{ fontWeight: 400, fontStyle: 'italic' }}>(auto-filled)</span></label>
            <input className="usa-input" value={selectedProgram?.federalOwner || ''} readOnly placeholder="Auto-filled from selected program" style={{ background: 'var(--usa-base-lightest)', color: 'var(--usa-base-dark)', cursor: 'default' }} />
          </div>

          <div>
            <label className="usa-label">Date Identified</label>
            <input className="usa-input" type="date" value={form.dateIdentified} onChange={(e) => setForm((prev) => ({ ...prev, dateIdentified: e.target.value }))} />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label className="usa-label">Title *</label>
            <input className="usa-input" value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label className="usa-label">Statement *</label>
            <textarea className="usa-textarea" rows={5} value={form.statement} onChange={(e) => setForm((prev) => ({ ...prev, statement: e.target.value }))} />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label className="usa-label">Impact</label>
            <textarea className="usa-textarea" rows={4} value={form.impact} onChange={(e) => setForm((prev) => ({ ...prev, impact: e.target.value }))} />
          </div>

          <div>
            <label className="usa-label">Impact Date</label>
            <input className="usa-input" type="date" value={form.impactDate} onChange={(e) => setForm((prev) => ({ ...prev, impactDate: e.target.value }))} />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label className="usa-label">Closure Criteria</label>
            <textarea className="usa-textarea" rows={4} value={form.closureCriteria} onChange={(e) => setForm((prev) => ({ ...prev, closureCriteria: e.target.value }))} />
          </div>
        </div>
      </div>

      <div className="detail-card" style={{ marginTop: 'var(--space-3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h2 style={{ margin: 0 }}>Mitigation Plan</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: 13, color: 'var(--usa-base-dark)' }}>Add action steps now if you have them. We can expand this workflow later.</p>
          </div>
          <button
            className="usa-button usa-button--success usa-button--sm"
            type="button"
            onClick={() => setMitigationActions((prev) => [...prev, { title: '', dueDate: '', status: 'yellow' }])}
          >
            <Icon name="add" size={14} /> Add Action Step
          </button>
        </div>

        {mitigationActions.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--usa-base-dark)' }}>No mitigation actions added yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {mitigationActions.map((action, index) => (
              <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
                <div>
                  <label className="usa-label">Mitigation Action Step</label>
                  <input className="usa-input" value={action.title} onChange={(e) => updateMitigationAction(index, 'title', e.target.value)} />
                </div>
                <div>
                  <label className="usa-label">Due Date</label>
                  <input className="usa-input" type="date" value={action.dueDate} onChange={(e) => updateMitigationAction(index, 'dueDate', e.target.value)} />
                </div>
                <div>
                  <label className="usa-label">Status</label>
                  <select className="usa-select" value={action.status} onChange={(e) => updateMitigationAction(index, 'status', e.target.value as RiskActionStatus)}>
                    {(Object.keys(RISK_ACTION_STATUS_LABELS) as RiskActionStatus[]).map((status) => (
                      <option key={status} value={status}>{RISK_ACTION_STATUS_LABELS[status]}</option>
                    ))}
                  </select>
                </div>
                <button
                  className="usa-button usa-button--unstyled"
                  type="button"
                  onClick={() => setMitigationActions((prev) => prev.filter((_, i) => i !== index))}
                  style={{ color: 'var(--usa-error)', paddingBottom: 8 }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 'var(--space-3)' }}>
        <button className="usa-button usa-button--outline" type="button" onClick={() => navigate('/risks/risks')}>Cancel</button>
        <button className="usa-button usa-button--primary" type="submit" disabled={createRisk.isPending}>
          {createRisk.isPending ? 'Creating...' : 'Create Risk'}
        </button>
      </div>
      </form>
    </div>
  );
}
