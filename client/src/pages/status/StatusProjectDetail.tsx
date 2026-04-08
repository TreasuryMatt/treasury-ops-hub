import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { statusProjectsApi } from '../../api/statusProjects';
import { assignmentsApi } from '../../api/assignments';
import { resourcesApi } from '../../api/resources';
import { adminApi } from '../../api/admin';
import { useAuth } from '../../context/AuthContext';
import { StatusProject, StatusUpdate, IssueEntry, Accomplishment, ProjectPhase, ProjectDocument, StatusProjectStatusType, Assignment } from '../../types';
import { Icon } from '../../components/Icon';
import { RagBadge } from '../../components/RagBadge';
import { GanttChart } from '../../components/GanttChart';

type Tab = 'overview' | 'updates' | 'accomplishments' | 'roadmap' | 'issues' | 'documents' | 'staffing';

export function StatusProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const canEdit = user?.role === 'editor' || user?.role === 'admin';
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const { data: project, isLoading } = useQuery<StatusProject>({
    queryKey: ['status-project', id],
    queryFn: () => statusProjectsApi.get(id!),
    enabled: !!id,
  });

  const { data: updates = [] } = useQuery<StatusUpdate[]>({
    queryKey: ['status-project-updates', id],
    queryFn: () => statusProjectsApi.listUpdates(id!),
    enabled: !!id && activeTab === 'updates',
  });

  const { data: phases = [] } = useQuery<ProjectPhase[]>({
    queryKey: ['status-project-phases', id],
    queryFn: () => statusProjectsApi.listPhases(id!),
    enabled: !!id && (activeTab === 'roadmap' || activeTab === 'overview'),
  });

  const { data: issues = [] } = useQuery<IssueEntry[]>({
    queryKey: ['status-project-issues', id],
    queryFn: () => statusProjectsApi.listIssues(id!),
    enabled: !!id && activeTab === 'issues',
  });

  const { data: accomplishments = [] } = useQuery<Accomplishment[]>({
    queryKey: ['status-project-accomplishments', id],
    queryFn: () => statusProjectsApi.listAccomplishments(id!),
    enabled: !!id && activeTab === 'accomplishments',
  });

  const { data: documents = [] } = useQuery<ProjectDocument[]>({
    queryKey: ['status-project-documents', id],
    queryFn: () => statusProjectsApi.listDocuments(id!),
    enabled: !!id && activeTab === 'documents',
  });

  if (isLoading) {
    return <div className="page-loading"><span className="usa-spinner" aria-label="Loading" /> Loading...</div>;
  }

  if (!project) return <div className="usa-page"><p>Project not found.</p></div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'updates', label: 'Updates' },
    { key: 'accomplishments', label: 'Accomplishments' },
    { key: 'roadmap', label: 'Roadmap' },
    { key: 'issues', label: 'Issues' },
    { key: 'documents', label: 'Documents' },
    { key: 'staffing', label: 'Staffing' },
  ];

  return (
    <div className="usa-page">
      <div className="usa-page-header">
        <button
          className="usa-button usa-button--unstyled"
          onClick={() => navigate('/status/projects')}
          style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <Icon name="arrow_back" size={16} /> Back to Projects
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div>
            <h1 className="usa-page-title">{project.name}</h1>
            <p className="usa-page-subtitle">
              <RagBadge status={project.status} />
              {project.program && <>{' '}{project.program.name}</>}
            </p>
          </div>
          {canEdit && (
            <button
              className="usa-button usa-button--outline"
              onClick={() => navigate(`/status/projects/${id}/edit`)}
            >
              <Icon name="edit" size={16} /> Edit
            </button>
          )}
        </div>
      </div>

      {/* Tab Bar */}
      <div style={{ borderBottom: '2px solid var(--usa-base-lighter)', marginBottom: 'var(--space-3)' }}>
        <div style={{ display: 'flex', gap: 0 }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '10px 20px',
                border: 'none',
                borderBottom: activeTab === tab.key ? '3px solid var(--usa-primary)' : '3px solid transparent',
                background: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                fontWeight: activeTab === tab.key ? 700 : 500,
                color: activeTab === tab.key ? 'var(--usa-primary)' : 'var(--usa-base-dark)',
                fontSize: 14,
                transition: 'color .12s, border-color .12s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && <OverviewTab project={project} phases={phases} />}
      {activeTab === 'updates' && <UpdatesTab projectId={id!} updates={updates} canEdit={canEdit} />}
      {activeTab === 'roadmap' && <RoadmapTab projectId={id!} phases={phases} canEdit={canEdit} />}
      {activeTab === 'accomplishments' && <AccomplishmentsTab projectId={id!} accomplishments={accomplishments} canEdit={canEdit} />}
      {activeTab === 'issues' && <IssuesTab projectId={id!} issues={issues} canEdit={canEdit} />}
      {activeTab === 'documents' && <DocumentsTab projectId={id!} documents={documents} canEdit={canEdit} />}
      {activeTab === 'staffing' && <StaffingTab projectId={id!} canEdit={canEdit} />}
    </div>
  );
}

function OverviewTab({ project, phases }: { project: StatusProject; phases: ProjectPhase[] }) {
  const fields = [
    { label: 'Program', value: project.program?.name },
    { label: 'Department', value: project.department?.name },
    { label: 'Owner', value: project.owner?.displayName },
    { label: 'Priority', value: project.priority?.name },
    { label: 'Execution Type', value: project.executionType?.name },
    { label: 'Customer Category', value: project.customerCategory?.name },
    { label: 'Phase', value: project.phase },
    { label: 'Funded', value: project.funded ? 'Yes' : 'No' },
    { label: 'Update Cadence', value: project.updateCadence },
    { label: 'Planned Start', value: project.plannedStartDate ? new Date(project.plannedStartDate).toLocaleDateString() : null },
    { label: 'Planned End', value: project.plannedEndDate ? new Date(project.plannedEndDate).toLocaleDateString() : null },
    { label: 'Actual Start', value: project.actualStartDate ? new Date(project.actualStartDate).toLocaleDateString() : null },
    { label: 'Actual End', value: project.actualEndDate ? new Date(project.actualEndDate).toLocaleDateString() : null },
  ];

  return (
    <div>
      {project.description && (
        <p style={{ marginBottom: 'var(--space-3)', color: 'var(--usa-base-dark)', fontSize: 15 }}>{project.description}</p>
      )}

      <div className="detail-card" style={{ marginBottom: 'var(--space-3)' }}>
        <dl className="detail-list">
          {fields.map((f) => (
            <React.Fragment key={f.label}>
              <dt>{f.label}</dt>
              <dd>{f.value || '—'}</dd>
            </React.Fragment>
          ))}
        </dl>
      </div>

      {project.products && project.products.length > 0 && (
        <div className="detail-card" style={{ marginBottom: 'var(--space-3)' }}>
          <h3>Linked Applications</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {project.products.map((pp) => (
              <span key={pp.id} className="badge badge--federal">{pp.product?.name}</span>
            ))}
          </div>
        </div>
      )}

      {phases.length > 0 && (
        <div className="detail-card">
          <h3>Roadmap</h3>
          <GanttChart phases={phases} />
        </div>
      )}
    </div>
  );
}

function UpdatesTab({ projectId, updates, canEdit }: { projectId: string; updates: StatusUpdate[]; canEdit: boolean }) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{
    overallStatus: StatusProjectStatusType;
    summary: string;
  }>();

  const addUpdate = useMutation({
    mutationFn: (data: any) => statusProjectsApi.createUpdate(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['status-project-updates', projectId] });
      qc.invalidateQueries({ queryKey: ['status-project', projectId] });
      reset();
    },
  });

  const STATUS_COLORS: Record<string, string> = {
    green: 'var(--usa-success)',
    yellow: 'var(--usa-warning-dark)',
    red: 'var(--usa-error)',
    gray: 'var(--usa-base)',
  };

  return (
    <div>
      {canEdit && (
        <div className="detail-card" style={{ marginBottom: 'var(--space-3)' }}>
          <h3>Add Status Update</h3>
          <form onSubmit={handleSubmit((data) => addUpdate.mutate(data))}>
            <div className="form-grid">
              <div className="usa-form-group">
                <label className="usa-label" htmlFor="overallStatus">Status *</label>
                <select className="usa-select" id="overallStatus" {...register('overallStatus', { required: true })}>
                  <option value="green">Green — On Track</option>
                  <option value="yellow">Yellow — At Risk</option>
                  <option value="red">Red — Off Track</option>
                </select>
              </div>
              <div className="usa-form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="usa-label" htmlFor="summary">Summary *</label>
                <textarea className="usa-textarea" id="summary" {...register('summary', { required: true })} rows={3} />
              </div>
            </div>
            <button type="submit" className="usa-button usa-button--success" disabled={addUpdate.isPending}>
              {addUpdate.isPending ? 'Submitting...' : 'Submit Update'}
            </button>
          </form>
        </div>
      )}

      {updates.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon"><Icon name="timeline" size={48} /></div>
          <h3>No updates yet</h3>
          <p>Submit a status update to start tracking this project.</p>
        </div>
      ) : (
        <div>
          {updates.map((u) => (
            <div
              key={u.id}
              style={{
                padding: 'var(--space-3)',
                borderLeft: `4px solid ${STATUS_COLORS[u.overallStatus] || 'var(--usa-base)'}`,
                marginBottom: 'var(--space-2)',
                background: 'var(--usa-white)',
                borderRadius: '0 var(--radius) var(--radius) 0',
                boxShadow: 'var(--shadow-1)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <RagBadge status={u.overallStatus} />
                  <strong>{u.author?.displayName}</strong>
                </div>
                <span className="text-sm text-muted">{new Date(u.createdAt).toLocaleString()}</span>
              </div>
              <p style={{ margin: 0 }}>{u.summary}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RoadmapTab({ projectId, phases, canEdit }: { projectId: string; phases: ProjectPhase[]; canEdit: boolean }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<ProjectPhase | null>(null);
  const [showForm, setShowForm] = useState(false);

  const createPhase = useMutation({
    mutationFn: (data: any) => statusProjectsApi.createPhase(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['status-project-phases', projectId] });
      setShowForm(false);
    },
  });

  const updatePhase = useMutation({
    mutationFn: ({ phaseId, data }: { phaseId: string; data: any }) => statusProjectsApi.updatePhase(projectId, phaseId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['status-project-phases', projectId] });
      setEditing(null);
    },
  });

  return (
    <div>
      {phases.length > 0 && (
        <div className="detail-card" style={{ marginBottom: 'var(--space-3)' }}>
          <GanttChart phases={phases} onPhaseClick={canEdit ? (p) => setEditing(p) : undefined} />
        </div>
      )}

      {phases.length === 0 && !showForm && (
        <div className="empty-state">
          <div className="empty-state__icon"><Icon name="timeline" size={48} /></div>
          <h3>No phases defined</h3>
          <p>Add phases to visualize this project's roadmap.</p>
        </div>
      )}

      {canEdit && (
        <div>
          {!showForm && !editing && (
            <button className="usa-button usa-button--outline" onClick={() => setShowForm(true)}>
              <Icon name="add" size={16} /> Add Phase
            </button>
          )}

          {(showForm || editing) && (
            <PhaseForm
              phase={editing}
              onSubmit={(data) => {
                if (editing) {
                  updatePhase.mutate({ phaseId: editing.id, data });
                } else {
                  createPhase.mutate(data);
                }
              }}
              onCancel={() => { setShowForm(false); setEditing(null); }}
              isPending={createPhase.isPending || updatePhase.isPending}
            />
          )}
        </div>
      )}
    </div>
  );
}

function PhaseForm({ phase, onSubmit, onCancel, isPending }: {
  phase: ProjectPhase | null;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const { register, handleSubmit } = useForm({
    defaultValues: phase ? {
      name: phase.name,
      startDate: phase.startDate.split('T')[0],
      endDate: phase.endDate.split('T')[0],
      color: phase.color || '#005ea2',
    } : { name: '', startDate: '', endDate: '', color: '#005ea2' },
  });

  return (
    <div className="detail-card" style={{ maxWidth: 520 }}>
      <h3>{phase ? 'Edit Phase' : 'New Phase'}</h3>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="usa-form-group">
          <label className="usa-label">Name *</label>
          <input className="usa-input" {...register('name', { required: true })} />
        </div>
        <div className="form-grid">
          <div className="usa-form-group">
            <label className="usa-label">Start Date *</label>
            <input className="usa-input" type="date" {...register('startDate', { required: true })} />
          </div>
          <div className="usa-form-group">
            <label className="usa-label">End Date *</label>
            <input className="usa-input" type="date" {...register('endDate', { required: true })} />
          </div>
        </div>
        <div className="usa-form-group">
          <label className="usa-label">Color</label>
          <input type="color" {...register('color')} style={{ width: 60, height: 36, border: '2px solid var(--usa-base-lighter)', borderRadius: 4, cursor: 'pointer' }} />
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
          <button type="submit" className="usa-button usa-button--success" disabled={isPending}>{isPending ? 'Saving...' : 'Save'}</button>
          <button type="button" className="usa-button usa-button--outline" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

function AccomplishmentsTab({ projectId, accomplishments, canEdit }: { projectId: string; accomplishments: Accomplishment[]; canEdit: boolean }) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset } = useForm<{ text: string }>();

  const addAccomplishment = useMutation({
    mutationFn: (data: { text: string }) => statusProjectsApi.createAccomplishment(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['status-project-accomplishments', projectId] });
      reset();
    },
  });

  const deleteAccomplishment = useMutation({
    mutationFn: (aId: string) => statusProjectsApi.deleteAccomplishment(projectId, aId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['status-project-accomplishments', projectId] }),
  });

  return (
    <div>
      {canEdit && (
        <div className="detail-card" style={{ marginBottom: 'var(--space-3)' }}>
          <h3>Log Accomplishment</h3>
          <form onSubmit={handleSubmit((data) => addAccomplishment.mutate(data))}>
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="usa-form-group" style={{ margin: 0, flex: 1, minWidth: 200 }}>
                <label className="usa-label">Description *</label>
                <input className="usa-input" placeholder="Describe the accomplishment..." {...register('text', { required: true })} />
              </div>
              <button type="submit" className="usa-button usa-button--success" disabled={addAccomplishment.isPending}>Add</button>
            </div>
          </form>
        </div>
      )}

      {accomplishments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon"><Icon name="emoji_events" size={48} /></div>
          <h3>No accomplishments logged</h3>
          <p>Log key wins and milestones as this project progresses.</p>
        </div>
      ) : (
        <div>
          {accomplishments.map((a) => (
            <div
              key={a.id}
              style={{
                padding: 'var(--space-2) var(--space-3)',
                borderLeft: '3px solid var(--usa-success)',
                marginBottom: 'var(--space-1)',
                background: 'var(--usa-white)',
                borderRadius: '0 var(--radius) var(--radius) 0',
                boxShadow: 'var(--shadow-1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 4px' }}>{a.text}</p>
                <span className="text-sm text-muted">{a.author?.displayName} · {new Date(a.createdAt).toLocaleDateString()}</span>
              </div>
              {canEdit && (
                <button
                  className="usa-button usa-button--unstyled"
                  style={{ color: 'var(--usa-error)', flexShrink: 0 }}
                  onClick={() => deleteAccomplishment.mutate(a.id)}
                  aria-label="Delete accomplishment"
                >
                  <Icon name="delete" size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function IssuesTab({ projectId, issues, canEdit }: { projectId: string; issues: IssueEntry[]; canEdit: boolean }) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset } = useForm<{ category: string; text: string }>();

  const addIssue = useMutation({
    mutationFn: (data: any) => statusProjectsApi.createIssue(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['status-project-issues', projectId] });
      reset();
    },
  });

  const CATEGORY_COLORS: Record<string, string> = {
    risk: 'var(--usa-warning-dark)',
    issue: 'var(--usa-error)',
    blocker: '#d83933',
  };

  const CATEGORY_TAG: Record<string, string> = {
    risk: 'usa-tag--yellow',
    issue: 'usa-tag--red',
    blocker: 'usa-tag--red',
  };

  return (
    <div>
      {canEdit && (
        <div className="detail-card" style={{ marginBottom: 'var(--space-3)' }}>
          <h3>Log Issue</h3>
          <form onSubmit={handleSubmit((data) => addIssue.mutate(data))}>
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="usa-form-group" style={{ margin: 0 }}>
                <label className="usa-label">Type</label>
                <select className="usa-select" {...register('category', { required: true })} style={{ minWidth: 120 }}>
                  <option value="risk">Risk</option>
                  <option value="issue">Issue</option>
                  <option value="blocker">Blocker</option>
                </select>
              </div>
              <div className="usa-form-group" style={{ margin: 0, flex: 1, minWidth: 200 }}>
                <label className="usa-label">Description *</label>
                <input className="usa-input" placeholder="Describe the issue..." {...register('text', { required: true })} />
              </div>
              <button type="submit" className="usa-button usa-button--success" disabled={addIssue.isPending}>Add</button>
            </div>
          </form>
        </div>
      )}

      {issues.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon"><Icon name="flag" size={48} /></div>
          <h3>No issues logged</h3>
          <p>Log risks, issues, or blockers to track them here.</p>
        </div>
      ) : (
        <div>
          {issues.map((iss) => (
            <div
              key={iss.id}
              style={{
                padding: 'var(--space-2) var(--space-3)',
                borderLeft: `3px solid ${CATEGORY_COLORS[iss.category] || 'var(--usa-base)'}`,
                marginBottom: 'var(--space-1)',
                background: 'var(--usa-white)',
                borderRadius: '0 var(--radius) var(--radius) 0',
                boxShadow: 'var(--shadow-1)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span className={`usa-tag ${CATEGORY_TAG[iss.category] || ''}`}>{iss.category.toUpperCase()}</span>
                <span className="text-sm text-muted">{iss.author?.displayName} · {new Date(iss.createdAt).toLocaleDateString()}</span>
              </div>
              <p style={{ margin: 0 }}>{iss.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DocumentsTab({ projectId, documents, canEdit }: { projectId: string; documents: ProjectDocument[]; canEdit: boolean }) {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await statusProjectsApi.uploadDocument(projectId, file);
      qc.invalidateQueries({ queryKey: ['status-project-documents', projectId] });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (docId: string) => {
    if (!window.confirm('Delete this document?')) return;
    await statusProjectsApi.deleteDocument(projectId, docId);
    qc.invalidateQueries({ queryKey: ['status-project-documents', projectId] });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div>
      {canEdit && (
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <label className="usa-button usa-button--outline" style={{ cursor: 'pointer' }}>
            <Icon name="attach_file" size={16} /> {uploading ? 'Uploading...' : 'Upload Document'}
            <input type="file" style={{ display: 'none' }} onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      )}

      {documents.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon"><Icon name="description" size={48} /></div>
          <h3>No documents</h3>
          <p>Upload documents to attach them to this project.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="usa-table">
            <thead>
              <tr>
                <th>File</th>
                <th>Size</th>
                <th>Uploaded By</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <a
                      href={`${process.env.REACT_APP_API_URL || 'http://localhost:3021/api'}/status-projects/${projectId}/documents/${doc.id}/download`}
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <Icon name="description" size={16} /> {doc.originalName}
                    </a>
                  </td>
                  <td className="text-muted">{formatSize(doc.sizeBytes)}</td>
                  <td>{doc.uploadedBy?.displayName}</td>
                  <td>{new Date(doc.createdAt).toLocaleDateString()}</td>
                  <td>
                    {canEdit && (
                      <button
                        className="usa-button usa-button--unstyled"
                        style={{ color: 'var(--usa-error)' }}
                        onClick={() => handleDelete(doc.id)}
                      >
                        <Icon name="delete" size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const EMPTY_NEW = { resourceId: '', roleId: '', percentUtilized: '', startDate: '', endDate: '' };
const EMPTY_EDIT = { roleId: '', percentUtilized: '', startDate: '', endDate: '' };

function StaffingTab({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [newForm, setNewForm] = useState(EMPTY_NEW);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT);

  const { data: staffing, isLoading } = useQuery({
    queryKey: ['status-project-staffing', projectId],
    queryFn: () => statusProjectsApi.getStaffing(projectId),
  });

  const linkedProjectId = staffing?.linkedProjectId ?? null;
  const assignments: any[] = staffing?.data ?? [];

  const { data: allResources } = useQuery({
    queryKey: ['resources-all'],
    queryFn: () => resourcesApi.list({ limit: '500', sortBy: 'lastName', sortDir: 'asc' }),
    enabled: canEdit,
  });

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: () => adminApi.roles(),
    enabled: canEdit,
  });

  const ensureProject = useMutation({
    mutationFn: () => statusProjectsApi.ensureLinkedProject(projectId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['status-project-staffing', projectId] });
      setShowAdd(true);
    },
  });

  const addAssignment = useMutation({
    mutationFn: (data: any) => assignmentsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['status-project-staffing', projectId] });
      setShowAdd(false);
      setNewForm(EMPTY_NEW);
    },
  });

  const updateAssignment = useMutation({
    mutationFn: ({ aId, data }: { aId: string; data: any }) => assignmentsApi.update(aId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['status-project-staffing', projectId] });
      setEditingId(null);
    },
  });

  const removeAssignment = useMutation({
    mutationFn: (aId: string) => assignmentsApi.remove(aId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['status-project-staffing', projectId] }),
  });

  function startEdit(a: any) {
    setEditingId(a.id);
    setEditForm({
      roleId: a.roleId ?? '',
      percentUtilized: String(Math.round(a.percentUtilized * 100)),
      startDate: a.startDate ? a.startDate.slice(0, 10) : '',
      endDate: a.endDate ? a.endDate.slice(0, 10) : '',
    });
  }

  function submitAdd() {
    if (!newForm.resourceId || !linkedProjectId) return;
    addAssignment.mutate({
      resourceId: newForm.resourceId,
      projectId: linkedProjectId,
      roleId: newForm.roleId || null,
      percentUtilized: parseFloat(newForm.percentUtilized) / 100 || 0,
      startDate: newForm.startDate || null,
      endDate: newForm.endDate || null,
    });
  }

  function submitEdit(aId: string) {
    updateAssignment.mutate({
      aId,
      data: {
        roleId: editForm.roleId || null,
        percentUtilized: parseFloat(editForm.percentUtilized) / 100 || 0,
        startDate: editForm.startDate || null,
        endDate: editForm.endDate || null,
      },
    });
  }

  if (isLoading) return <div className="page-loading"><span className="usa-spinner" aria-label="Loading" /></div>;

  const assignedIds = new Set(assignments.map((a: any) => a.resourceId));
  const availableResources = (allResources?.data ?? []).filter((r) => !assignedIds.has(r.id));
  const totalUtilization = assignments.reduce((sum: number, a: any) => sum + a.percentUtilized, 0);
  const federalCount = assignments.filter((a: any) => a.resource?.resourceType === 'federal').length;
  const contractorCount = assignments.filter((a: any) => a.resource?.resourceType === 'contractor').length;
  const avgUtilization = assignments.length > 0 ? totalUtilization / assignments.length : 0;

  return (
    <div>
      {assignments.length > 0 && (
        <div className="stat-grid" style={{ marginBottom: 'var(--space-3)' }}>
          <div className="stat-card" style={{ borderTopColor: 'var(--usa-primary)' }}>
            <div className="stat-card__value">{assignments.length}</div>
            <div className="stat-card__label">Team Members</div>
            <div className="stat-card__detail">{federalCount} Federal / {contractorCount} Contractor</div>
          </div>
          <div className="stat-card" style={{ borderTopColor: 'var(--usa-accent-cool-dark)' }}>
            <div className="stat-card__value">{(totalUtilization).toFixed(1)} FTEs</div>
            <div className="stat-card__label">Total Allocated</div>
            <div className="stat-card__detail">{Math.round(totalUtilization * 100)}% capacity</div>
          </div>
          <div className="stat-card" style={{ borderTopColor: avgUtilization >= 0.8 ? 'var(--usa-success)' : avgUtilization >= 0.5 ? 'var(--usa-warning)' : 'var(--usa-error)' }}>
            <div className="stat-card__value">{Math.round(avgUtilization * 100)}%</div>
            <div className="stat-card__label">Avg Allocation</div>
            <div className="stat-card__detail">per team member</div>
          </div>
        </div>
      )}

      <div className="section-header">
        <h2 className="section-title">Team Roster ({assignments.length})</h2>
        {canEdit && (
          linkedProjectId ? (
            <button
              className="usa-button usa-button--outline"
              onClick={() => { setShowAdd(!showAdd); setNewForm(EMPTY_NEW); }}
            >
              <Icon name="add" size={16} /> Add Member
            </button>
          ) : (
            <button
              className="usa-button usa-button--outline"
              onClick={() => ensureProject.mutate()}
              disabled={ensureProject.isPending}
            >
              <Icon name="people" size={16} /> {ensureProject.isPending ? 'Setting up...' : 'Enable Staffing'}
            </button>
          )
        )}
      </div>

      {showAdd && linkedProjectId && (
        <div className="detail-card" style={{ marginBottom: 'var(--space-2)' }}>
          <h3>Add Team Member</h3>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="usa-form-group" style={{ margin: 0, minWidth: 220 }}>
              <label className="usa-label">Resource</label>
              <select
                className="usa-select"
                value={newForm.resourceId}
                onChange={(e) => setNewForm({ ...newForm, resourceId: e.target.value })}
              >
                <option value="">— Select resource —</option>
                {availableResources.map((r) => (
                  <option key={r.id} value={r.id}>{r.lastName}, {r.firstName}</option>
                ))}
              </select>
            </div>
            <div className="usa-form-group" style={{ margin: 0 }}>
              <label className="usa-label">Role</label>
              <select
                className="usa-select"
                value={newForm.roleId}
                onChange={(e) => setNewForm({ ...newForm, roleId: e.target.value })}
              >
                <option value="">— None —</option>
                {roles?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div className="usa-form-group" style={{ margin: 0 }}>
              <label className="usa-label">% Allocated</label>
              <input
                className="usa-input"
                type="number" min="0" max="100" step="5"
                placeholder="50"
                value={newForm.percentUtilized}
                onChange={(e) => setNewForm({ ...newForm, percentUtilized: e.target.value })}
                style={{ width: 80 }}
              />
            </div>
            <div className="usa-form-group" style={{ margin: 0 }}>
              <label className="usa-label">Start Date</label>
              <input
                className="usa-input"
                type="date"
                value={newForm.startDate}
                onChange={(e) => setNewForm({ ...newForm, startDate: e.target.value })}
                style={{ width: 150 }}
              />
            </div>
            <div className="usa-form-group" style={{ margin: 0 }}>
              <label className="usa-label">End Date</label>
              <input
                className="usa-input"
                type="date"
                value={newForm.endDate}
                onChange={(e) => setNewForm({ ...newForm, endDate: e.target.value })}
                style={{ width: 150 }}
              />
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
              <button
                className="usa-button usa-button--success"
                onClick={submitAdd}
                disabled={!newForm.resourceId || addAssignment.isPending}
              >
                {addAssignment.isPending ? 'Saving...' : 'Save'}
              </button>
              <button
                className="usa-button usa-button--outline"
                onClick={() => { setShowAdd(false); setNewForm(EMPTY_NEW); }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {assignments.length === 0 && !showAdd ? (
        <div className="empty-state">
          <div className="empty-state__icon"><Icon name="people" size={48} /></div>
          <h3>No team members yet</h3>
          <p>{canEdit ? 'Click "Add Member" to assign resources to this project.' : 'No resources have been assigned to this project.'}</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="usa-table">
            <thead>
              <tr>
                <th>Resource</th>
                <th>Role</th>
                <th>% Allocated</th>
                <th>Start</th>
                <th>End</th>
                {canEdit && <th></th>}
              </tr>
            </thead>
            <tbody>
              {assignments.map((a: any) => {
                const isEditing = editingId === a.id;
                return (
                  <tr key={a.id}>
                    <td
                      style={{ fontWeight: 600, cursor: 'pointer', color: 'var(--usa-primary)' }}
                      onClick={() => !isEditing && navigate(`/resources/${a.resourceId}`)}
                    >
                      {a.resource ? `${a.resource.lastName}, ${a.resource.firstName}` : '—'}
                    </td>

                    {isEditing ? (
                      <>
                        <td>
                          <select
                            className="usa-select"
                            value={editForm.roleId}
                            onChange={(e) => setEditForm({ ...editForm, roleId: e.target.value })}
                            style={{ minWidth: 140 }}
                          >
                            <option value="">— None —</option>
                            {roles?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                          </select>
                        </td>
                        <td>
                          <input
                            className="usa-input"
                            type="number" min="0" max="100" step="5"
                            value={editForm.percentUtilized}
                            onChange={(e) => setEditForm({ ...editForm, percentUtilized: e.target.value })}
                            style={{ width: 70 }}
                          />
                        </td>
                        <td>
                          <input
                            className="usa-input"
                            type="date"
                            value={editForm.startDate}
                            onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                            style={{ width: 140 }}
                          />
                        </td>
                        <td>
                          <input
                            className="usa-input"
                            type="date"
                            value={editForm.endDate}
                            onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                            style={{ width: 140 }}
                          />
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="usa-button usa-button--success"
                              style={{ padding: '4px 10px', fontSize: 13 }}
                              onClick={() => submitEdit(a.id)}
                              disabled={updateAssignment.isPending}
                            >
                              Save
                            </button>
                            <button
                              className="usa-button usa-button--outline"
                              style={{ padding: '4px 10px', fontSize: 13 }}
                              onClick={() => setEditingId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{a.role?.name || '—'}</td>
                        <td>{Math.round(a.percentUtilized * 100)}%</td>
                        <td>{a.startDate ? new Date(a.startDate).toLocaleDateString() : '—'}</td>
                        <td>{a.endDate ? new Date(a.endDate).toLocaleDateString() : '—'}</td>
                        {canEdit && (
                          <td>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button
                                className="usa-button usa-button--unstyled"
                                aria-label="Edit assignment"
                                title="Edit"
                                onClick={() => startEdit(a)}
                                style={{ color: 'var(--usa-primary)' }}
                              >
                                <Icon name="edit" size={16} color="var(--usa-primary)" />
                              </button>
                              <button
                                className="usa-button usa-button--unstyled"
                                aria-label="Remove assignment"
                                title="Remove"
                                onClick={() => removeAssignment.mutate(a.id)}
                                style={{ color: 'var(--usa-error)' }}
                              >
                                <Icon name="delete" size={16} color="var(--usa-error)" />
                              </button>
                            </div>
                          </td>
                        )}
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
