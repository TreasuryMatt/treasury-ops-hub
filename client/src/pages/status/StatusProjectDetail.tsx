import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { statusProjectsApi } from '../../api/statusProjects';
import { assignmentsApi } from '../../api/assignments';
import { resourcesApi } from '../../api/resources';
import { adminApi } from '../../api/admin';
import { useAuth } from '../../context/AuthContext';
import { StatusProject, StatusUpdate, IssueEntry, Accomplishment, ProjectPhase, ProjectDocument, StatusProjectStatusType } from '../../types';
import { Icon } from '../../components/Icon';
import { RagBadge } from '../../components/RagBadge';
import { GanttChart } from '../../components/GanttChart';

type Tab = 'overview' | 'updates' | 'accomplishments' | 'issues' | 'documents' | 'staffing';

export function StatusProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = user?.role === 'editor' || user?.role === 'manager' || user?.role === 'admin';
  const canManageAssignments = !!user && (user.isResourceManager || user.role === 'manager' || user.role === 'admin');
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
    enabled: !!id && activeTab === 'overview',
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
    { key: 'accomplishments', label: 'Successes' },
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
            <h1 className="usa-page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="lightbulb" color="var(--usa-primary)" size={24} />
              {project.name}
            </h1>
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
      {activeTab === 'accomplishments' && <AccomplishmentsTab projectId={id!} accomplishments={accomplishments} canEdit={canEdit} />}
      {activeTab === 'issues' && <IssuesTab projectId={id!} issues={issues} canEdit={canEdit} />}
      {activeTab === 'documents' && <DocumentsTab projectId={id!} documents={documents} canEdit={canEdit} />}
      {activeTab === 'staffing' && <StaffingTab projectId={id!} canEdit={canManageAssignments} />}
    </div>
  );
}

function OverviewTab({ project, phases }: { project: StatusProject; phases: ProjectPhase[] }) {
  const { user } = useAuth();
  const canEdit = user?.role === 'editor' || user?.role === 'manager' || user?.role === 'admin';
  const [editing, setEditing] = useState<ProjectPhase | null>(null);
  const [showForm, setShowForm] = useState(false);
  const qc = useQueryClient();
  const projectId = project.id;

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

  const sections = [
    {
      title: 'Organization',
      fields: [
        { label: 'Program', value: project.program?.name },
        { label: 'Application', value: project.application?.name },
        { label: 'Department', value: project.department?.name },
      ],
    },
    {
      title: 'Leadership',
      fields: [
        { label: 'Federal Product Owner', value: project.federalProductOwner },
        { label: 'Customer Contact', value: project.customerContact },
      ],
    },
    {
      title: 'Project Definition',
      fields: [
        { label: 'Priority', value: project.priority?.name },
        { label: 'Execution Type', value: project.executionType?.name },
        { label: 'Customer Category', value: project.customerCategory?.name },
      ],
    },
    {
      title: 'Status',
      fields: [
        { label: 'Phase', value: project.phase?.name },
        { label: 'Funded', value: project.funded ? 'Yes' : 'No' },
        { label: 'Update Cadence', value: project.updateCadence },
      ],
    },
    {
      title: 'Timeline',
      fields: [
        { label: 'Planned Start', value: project.plannedStartDate ? new Date(project.plannedStartDate).toLocaleDateString() : null },
        { label: 'Planned End', value: project.plannedEndDate ? new Date(project.plannedEndDate).toLocaleDateString() : null },
        { label: 'Actual Start', value: project.actualStartDate ? new Date(project.actualStartDate).toLocaleDateString() : null },
        { label: 'Actual End', value: project.actualEndDate ? new Date(project.actualEndDate).toLocaleDateString() : null },
      ],
    },
  ];

  return (
    <div>
      {project.description && (
        <p style={{ marginBottom: 'var(--space-3)', color: 'var(--usa-base-dark)', fontSize: 15 }}>{project.description}</p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
        {/* Left card: Organization, Leadership, Project Definition */}
        <div className="detail-card">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)' }}>
            {sections.slice(0, 3).map((section) => (
              <div key={section.title}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--usa-base)', margin: '0 0 var(--space-2) 0' }}>{section.title}</p>
                <dl style={{ margin: 0, padding: 0 }}>
                  {section.fields.map((f) => (
                    <React.Fragment key={f.label}>
                      <dt style={{ fontSize: 11, color: 'var(--usa-base)', margin: '0 0 2px 0', padding: 0 }}>{f.label}</dt>
                      <dd style={{ fontSize: 14, fontWeight: 600, color: 'var(--usa-base-darkest)', margin: '0 0 12px 0', padding: 0 }}>{f.value || '—'}</dd>
                    </React.Fragment>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </div>
        {/* Right card: Status, Timeline */}
        <div className="detail-card">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)' }}>
            {sections.slice(3).map((section) => (
              <div key={section.title}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--usa-base)', margin: '0 0 var(--space-2) 0' }}>{section.title}</p>
                <dl style={{ margin: 0, padding: 0 }}>
                  {section.fields.map((f) => (
                    <React.Fragment key={f.label}>
                      <dt style={{ fontSize: 11, color: 'var(--usa-base)', margin: '0 0 2px 0', padding: 0 }}>{f.label}</dt>
                      <dd style={{ fontSize: 14, fontWeight: 600, color: 'var(--usa-base-darkest)', margin: '0 0 12px 0', padding: 0 }}>{f.value || '—'}</dd>
                    </React.Fragment>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="detail-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: phases.length > 0 ? 'var(--space-3)' : 0 }}>
          <h3 style={{ margin: 0 }}>Roadmap</h3>
          {canEdit && !showForm && !editing && (
            <button className="usa-button usa-button--outline" onClick={() => setShowForm(true)} style={{ fontSize: 13, padding: '6px 12px' }}>
              <Icon name="add" size={14} /> Add Phase
            </button>
          )}
        </div>

        {phases.length > 0 && (
          <GanttChart phases={phases} onPhaseClick={canEdit ? (p) => setEditing(p) : undefined} />
        )}

        {phases.length === 0 && !showForm && !editing && (
          <div className="empty-state" style={{ padding: 'var(--space-2)' }}>
            <p style={{ margin: 0, color: 'var(--usa-base)', fontSize: 14 }}>No phases defined yet{canEdit ? '.' : ''}</p>
          </div>
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
    </div>
  );
}

function UpdatesTab({ projectId, updates, canEdit }: { projectId: string; updates: StatusUpdate[]; canEdit: boolean }) {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const { register, handleSubmit, reset } = useForm<{ overallStatus: StatusProjectStatusType; summary: string }>();
  const { register: regEdit, handleSubmit: handleEdit, reset: resetEdit } = useForm<{ overallStatus: StatusProjectStatusType; summary: string }>();

  const addUpdate = useMutation({
    mutationFn: (data: any) => statusProjectsApi.createUpdate(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['status-project-updates', projectId] });
      qc.invalidateQueries({ queryKey: ['status-project', projectId] });
      reset();
    },
  });

  const saveUpdate = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => statusProjectsApi.updateUpdate(projectId, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['status-project-updates', projectId] });
      setEditingId(null);
    },
  });

  const deleteUpdate = useMutation({
    mutationFn: (id: string) => statusProjectsApi.deleteUpdate(projectId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['status-project-updates', projectId] }),
  });

  const STATUS_COLORS: Record<string, string> = {
    green: 'var(--usa-success)',
    yellow: 'var(--usa-warning-dark)',
    red: 'var(--usa-error)',
    gray: 'var(--usa-base)',
  };

  function startEdit(u: StatusUpdate) {
    resetEdit({ overallStatus: u.overallStatus, summary: u.summary });
    setEditingId(u.id);
  }

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
              {editingId === u.id ? (
                <form onSubmit={handleEdit((data) => saveUpdate.mutate({ id: u.id, data }))}>
                  <div className="form-grid" style={{ marginBottom: 'var(--space-2)' }}>
                    <div className="usa-form-group">
                      <label className="usa-label">Status *</label>
                      <select className="usa-select" {...regEdit('overallStatus', { required: true })}>
                        <option value="green">Green — On Track</option>
                        <option value="yellow">Yellow — At Risk</option>
                        <option value="red">Red — Off Track</option>
                      </select>
                    </div>
                    <div className="usa-form-group" style={{ gridColumn: '1 / -1' }}>
                      <label className="usa-label">Summary *</label>
                      <textarea className="usa-textarea" {...regEdit('summary', { required: true })} rows={3} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                    <button type="submit" className="usa-button usa-button--success" disabled={saveUpdate.isPending}>
                      {saveUpdate.isPending ? 'Saving...' : 'Save'}
                    </button>
                    <button type="button" className="usa-button usa-button--outline" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                </form>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <RagBadge status={u.overallStatus} />
                      <strong>{u.author?.displayName}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="text-sm text-muted">{new Date(u.createdAt).toLocaleString()}</span>
                      {canEdit && (
                        <>
                          <button className="usa-button usa-button--unstyled" style={{ color: 'var(--usa-primary)' }} onClick={() => startEdit(u)} aria-label="Edit update">
                            <Icon name="edit" size={15} />
                          </button>
                          <button className="usa-button usa-button--unstyled" style={{ color: 'var(--usa-error)' }} onClick={() => deleteUpdate.mutate(u.id)} aria-label="Delete update">
                            <Icon name="delete" size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <p style={{ margin: 0 }}>{u.summary}</p>
                </>
              )}
            </div>
          ))}
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const { register, handleSubmit, reset } = useForm<{ text: string }>();

  const addAccomplishment = useMutation({
    mutationFn: (data: { text: string }) => statusProjectsApi.createAccomplishment(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['status-project-accomplishments', projectId] });
      reset();
    },
  });

  const saveAccomplishment = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => statusProjectsApi.updateAccomplishment(projectId, id, { text }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['status-project-accomplishments', projectId] });
      setEditingId(null);
    },
  });

  const deleteAccomplishment = useMutation({
    mutationFn: (aId: string) => statusProjectsApi.deleteAccomplishment(projectId, aId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['status-project-accomplishments', projectId] }),
  });

  function startEdit(a: Accomplishment) {
    setEditText(a.text);
    setEditingId(a.id);
  }

  return (
    <div>
      {canEdit && (
        <div className="detail-card" style={{ marginBottom: 'var(--space-3)' }}>
          <h3>Log Success</h3>
          <form onSubmit={handleSubmit((data) => addAccomplishment.mutate(data))}>
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="usa-form-group" style={{ margin: 0, flex: 1, minWidth: 200 }}>
                <label className="usa-label">Description *</label>
                <input className="usa-input" placeholder="Describe the success..." {...register('text', { required: true })} />
              </div>
              <button type="submit" className="usa-button usa-button--success" disabled={addAccomplishment.isPending}>Add</button>
            </div>
          </form>
        </div>
      )}

      {accomplishments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon"><Icon name="emoji_events" size={48} /></div>
          <h3>No successes logged</h3>
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
              }}
            >
              {editingId === a.id ? (
                <div style={{ display: 'flex', gap: 'var(--space-1)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <input
                    className="usa-input"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    style={{ flex: 1, minWidth: 200 }}
                    autoFocus
                  />
                  <button
                    className="usa-button usa-button--success"
                    disabled={saveAccomplishment.isPending || !editText.trim()}
                    onClick={() => saveAccomplishment.mutate({ id: a.id, text: editText })}
                  >
                    {saveAccomplishment.isPending ? 'Saving...' : 'Save'}
                  </button>
                  <button className="usa-button usa-button--outline" onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 4px' }}>{a.text}</p>
                    <span className="text-sm text-muted">{a.author?.displayName} · {new Date(a.createdAt).toLocaleDateString()}</span>
                  </div>
                  {canEdit && (
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button className="usa-button usa-button--unstyled" style={{ color: 'var(--usa-primary)' }} onClick={() => startEdit(a)} aria-label="Edit success">
                        <Icon name="edit" size={15} />
                      </button>
                      <button className="usa-button usa-button--unstyled" style={{ color: 'var(--usa-error)' }} onClick={() => deleteAccomplishment.mutate(a.id)} aria-label="Delete success">
                        <Icon name="delete" size={15} />
                      </button>
                    </div>
                  )}
                </div>
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');
  const [editForm, setEditForm] = useState<{ category: string; text: string }>({ category: 'risk', text: '' });
  const { register, handleSubmit, reset } = useForm<{ category: string; text: string }>();

  const invalidateIssues = () => qc.invalidateQueries({ queryKey: ['status-project-issues', projectId] });

  const addIssue = useMutation({
    mutationFn: (data: any) => statusProjectsApi.createIssue(projectId, data),
    onSuccess: () => { invalidateIssues(); reset(); },
  });

  const saveIssue = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => statusProjectsApi.updateIssue(projectId, id, data),
    onSuccess: () => { invalidateIssues(); setEditingId(null); },
  });

  const deleteIssue = useMutation({
    mutationFn: (id: string) => statusProjectsApi.deleteIssue(projectId, id),
    onSuccess: invalidateIssues,
  });

  const resolveIssue = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) => statusProjectsApi.resolveIssue(projectId, id, notes),
    onSuccess: () => { invalidateIssues(); setResolvingId(null); setResolveNotes(''); },
  });

  const reopenIssue = useMutation({
    mutationFn: (id: string) => statusProjectsApi.reopenIssue(projectId, id),
    onSuccess: invalidateIssues,
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

  function startEdit(iss: IssueEntry) {
    setEditForm({ category: iss.category, text: iss.text });
    setEditingId(iss.id);
    setResolvingId(null);
  }

  function startResolve(iss: IssueEntry) {
    setResolvingId(iss.id);
    setResolveNotes('');
    setEditingId(null);
  }

  const openIssues = issues.filter((i) => !i.resolvedAt);
  const resolvedIssues = issues.filter((i) => !!i.resolvedAt);

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
          {/* Open issues */}
          {openIssues.map((iss) => (
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
              {editingId === iss.id ? (
                <div>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 'var(--space-1)' }}>
                    <div className="usa-form-group" style={{ margin: 0 }}>
                      <label className="usa-label">Type</label>
                      <select
                        className="usa-select"
                        value={editForm.category}
                        onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                        style={{ minWidth: 120 }}
                      >
                        <option value="risk">Risk</option>
                        <option value="issue">Issue</option>
                        <option value="blocker">Blocker</option>
                      </select>
                    </div>
                    <div className="usa-form-group" style={{ margin: 0, flex: 1, minWidth: 200 }}>
                      <label className="usa-label">Description *</label>
                      <input
                        className="usa-input"
                        value={editForm.text}
                        onChange={(e) => setEditForm((f) => ({ ...f, text: e.target.value }))}
                        autoFocus
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                    <button
                      className="usa-button usa-button--success"
                      disabled={saveIssue.isPending || !editForm.text.trim()}
                      onClick={() => saveIssue.mutate({ id: iss.id, data: editForm })}
                    >
                      {saveIssue.isPending ? 'Saving...' : 'Save'}
                    </button>
                    <button className="usa-button usa-button--outline" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                </div>
              ) : resolvingId === iss.id ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span className={`usa-tag ${CATEGORY_TAG[iss.category] || ''}`}>{iss.category.toUpperCase()}</span>
                  </div>
                  <p style={{ margin: '0 0 var(--space-1) 0' }}>{iss.text}</p>
                  <div className="usa-form-group" style={{ margin: '0 0 var(--space-1) 0' }}>
                    <label className="usa-label">Resolution Notes</label>
                    <textarea
                      className="usa-textarea"
                      rows={2}
                      placeholder="Describe how this was resolved..."
                      value={resolveNotes}
                      onChange={(e) => setResolveNotes(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                    <button
                      className="usa-button usa-button--success"
                      disabled={resolveIssue.isPending}
                      onClick={() => resolveIssue.mutate({ id: iss.id, notes: resolveNotes })}
                    >
                      {resolveIssue.isPending ? 'Resolving...' : 'Mark Resolved'}
                    </button>
                    <button className="usa-button usa-button--outline" onClick={() => setResolvingId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span className={`usa-tag ${CATEGORY_TAG[iss.category] || ''}`}>{iss.category.toUpperCase()}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="text-sm text-muted">{iss.author?.displayName} · {new Date(iss.createdAt).toLocaleDateString()}</span>
                      {canEdit && (
                        <>
                          <button className="usa-button usa-button--unstyled" style={{ color: 'var(--usa-success)' }} onClick={() => startResolve(iss)} aria-label="Resolve issue" title="Resolve">
                            <Icon name="check_circle" size={15} />
                          </button>
                          <button className="usa-button usa-button--unstyled" style={{ color: 'var(--usa-primary)' }} onClick={() => startEdit(iss)} aria-label="Edit issue">
                            <Icon name="edit" size={15} />
                          </button>
                          <button className="usa-button usa-button--unstyled" style={{ color: 'var(--usa-error)' }} onClick={() => deleteIssue.mutate(iss.id)} aria-label="Delete issue">
                            <Icon name="delete" size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <p style={{ margin: 0 }}>{iss.text}</p>
                </>
              )}
            </div>
          ))}

          {/* Resolved issues */}
          {resolvedIssues.length > 0 && (
            <>
              {openIssues.length > 0 && (
                <div style={{ margin: 'var(--space-3) 0 var(--space-2)', display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                  <div style={{ flex: 1, height: 1, background: 'var(--usa-base-lighter)' }} />
                  <span className="text-sm text-muted" style={{ fontWeight: 600 }}>Resolved ({resolvedIssues.length})</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--usa-base-lighter)' }} />
                </div>
              )}
              {resolvedIssues.map((iss) => (
                <div
                  key={iss.id}
                  style={{
                    padding: 'var(--space-2) var(--space-3)',
                    borderLeft: '3px solid var(--usa-success)',
                    marginBottom: 'var(--space-1)',
                    background: 'var(--usa-white)',
                    borderRadius: '0 var(--radius) var(--radius) 0',
                    boxShadow: 'var(--shadow-1)',
                    opacity: 0.75,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                      <span className={`usa-tag ${CATEGORY_TAG[iss.category] || ''}`} style={{ opacity: 0.6 }}>{iss.category.toUpperCase()}</span>
                      <span className="usa-tag" style={{ background: 'var(--usa-success)', color: '#fff' }}>RESOLVED</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="text-sm text-muted">{iss.author?.displayName} · {new Date(iss.createdAt).toLocaleDateString()}</span>
                      {canEdit && (
                        <button className="usa-button usa-button--unstyled" style={{ color: 'var(--usa-warning-dark)' }} onClick={() => reopenIssue.mutate(iss.id)} aria-label="Reopen issue" title="Reopen">
                          <Icon name="history" size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                  <p style={{ margin: 0, textDecoration: 'line-through', color: 'var(--usa-base)' }}>{iss.text}</p>
                  {iss.resolutionNotes && (
                    <p style={{ margin: 'var(--space-1) 0 0', fontSize: '0.875rem', color: 'var(--usa-success-darker)' }}>
                      <strong>Resolution:</strong> {iss.resolutionNotes}
                    </p>
                  )}
                  <p className="text-sm text-muted" style={{ margin: 'var(--space-half) 0 0' }}>
                    Resolved by {iss.resolvedBy?.displayName} on {new Date(iss.resolvedAt!).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </>
          )}
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
