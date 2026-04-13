import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '../api/projects';
import { assignmentsApi } from '../api/assignments';
import { resourcesApi } from '../api/resources';
import { adminApi } from '../api/admin';
import { useAuth } from '../context/AuthContext';
import { Icon } from '../components/Icon';
import { Assignment } from '../types';

const STATUS_LABELS: Record<string, string> = {
  in_progress: 'In Progress',
  on_hold: 'On Hold',
  completed: 'Completed',
};

const EMPTY_NEW = { resourceId: '', roleId: '', percentUtilized: '', startDate: '', endDate: '' };
const EMPTY_EDIT = { roleId: '', percentUtilized: '', startDate: '', endDate: '' };

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const canEdit = user?.role === 'editor' || user?.role === 'manager' || user?.role === 'admin';

  const [showAdd, setShowAdd] = useState(false);
  const [newForm, setNewForm] = useState(EMPTY_NEW);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(id!),
  });

  const { data: allResources } = useQuery({
    queryKey: ['resources-all'],
    queryFn: () => resourcesApi.list({ limit: '500', sortBy: 'lastName', sortDir: 'asc' }),
    enabled: showAdd,
  });



  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: () => adminApi.roles(),
    enabled: showAdd || editingId !== null,
  });

  const addAssignment = useMutation({
    mutationFn: (data: any) => assignmentsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', id] });
      setShowAdd(false);
      setNewForm(EMPTY_NEW);
    },
  });

  const updateAssignment = useMutation({
    mutationFn: ({ aId, data }: { aId: string; data: any }) => assignmentsApi.update(aId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', id] });
      setEditingId(null);
      setEditForm(EMPTY_EDIT);
    },
  });

  const removeAssignment = useMutation({
    mutationFn: (aId: string) => assignmentsApi.remove(aId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project', id] }),
  });

  if (isLoading || !project) {
    return <div className="usa-page"><span className="usa-spinner" aria-label="Loading" /></div>;
  }

  const totalUtilization = project.assignments.reduce((sum, a) => sum + a.percentUtilized, 0);

  // Exclude already-assigned resources from the picker
  const assignedIds = new Set(project.assignments.map((a) => a.resourceId));
  const availableResources = (allResources?.data ?? []).filter((r) => !assignedIds.has(r.id));

  function startEdit(a: Assignment) {
    setEditingId(a.id);
    setEditForm({
      roleId: a.roleId ?? '',
      percentUtilized: String(Math.round(a.percentUtilized * 100)),
      startDate: a.startDate ? a.startDate.slice(0, 10) : '',
      endDate: a.endDate ? a.endDate.slice(0, 10) : '',
    });
  }

  function saveEdit(aId: string) {
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

  function submitAdd() {
    if (!newForm.resourceId) return;
    addAssignment.mutate({
      resourceId: newForm.resourceId,
      projectId: id,
      roleId: newForm.roleId || null,
      percentUtilized: parseFloat(newForm.percentUtilized) / 100 || 0,
      startDate: newForm.startDate || null,
      endDate: newForm.endDate || null,
    });
  }

  const colCount = canEdit ? 7 : 5;

  return (
    <div className="usa-page">
      <div className="usa-page-header">
        <button
          className="usa-button usa-button--unstyled"
          onClick={() => navigate('/projects')}
          style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <Icon name="arrow_back" size={16} /> Back to Projects
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div>
            <h1 className="usa-page-title">{project.name}</h1>
            <p className="usa-page-subtitle">
              <span className={`status-badge status-badge--${project.status}`}>{STATUS_LABELS[project.status]}</span>
              {project.product && <span> / {project.product.name}</span>}
            </p>
          </div>
          {canEdit && (
            <button
              className="usa-button usa-button--outline"
              style={{ flexShrink: 0 }}
              onClick={() => navigate(`/projects/${id}/edit`)}
            >
              <Icon name="edit" size={16} /> Edit
            </button>
          )}
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-card">
          <h3>Project Details</h3>
          <dl className="detail-list">
            <dt>Application</dt><dd>{project.product?.name || '-'}</dd>
            <dt>Federal Product Owner</dt><dd>{project.federalProductOwner || '-'}</dd>
            <dt>Customer Contact</dt><dd>{project.customerContact || '-'}</dd>
            <dt>Priority</dt><dd style={{ textTransform: 'capitalize' }}>{project.priority || '-'}</dd>
            <dt>Status</dt><dd>{STATUS_LABELS[project.status]}</dd>
            <dt>Start Date</dt><dd>{project.startDate ? new Date(project.startDate).toLocaleDateString() : '-'}</dd>
            <dt>End Date</dt><dd>{project.endDate ? new Date(project.endDate).toLocaleDateString() : '-'}</dd>
          </dl>
        </div>

        <div className="detail-card">
          <h3>Team Summary</h3>
          <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--usa-primary)' }}>{project.teamSize}</div>
          <div style={{ fontSize: 14, color: 'var(--usa-base)' }}>Team Members</div>
          <div style={{ marginTop: 12, fontSize: 24, fontWeight: 600 }}>
            {Math.round(totalUtilization * 100)}%
          </div>
          <div style={{ fontSize: 14, color: 'var(--usa-base)' }}>Allocated FTEs</div>
        </div>
      </div>

      {project.description && (
        <div className="detail-card" style={{ marginTop: 16 }}>
          <h3>Description</h3>
          <p>{project.description}</p>
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: 18 }}>Team Roster ({project.assignments.length})</h2>
          {canEdit && (
            <button className="usa-button usa-button--outline" onClick={() => { setShowAdd(!showAdd); setNewForm(EMPTY_NEW); }}>
              <Icon name="add" size={16} /> Add Member
            </button>
          )}
        </div>

        {showAdd && (
          <div className="detail-card" style={{ marginBottom: 16 }}>
            <h4 style={{ marginBottom: 12 }}>Add Team Member</h4>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ minWidth: 220 }}>
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
              <div>
                <label className="usa-label">Role</label>
                <select className="usa-select" value={newForm.roleId} onChange={(e) => setNewForm({ ...newForm, roleId: e.target.value })}>
                  <option value="">— Select role —</option>
                  {roles?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
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
              <div>
                <label className="usa-label">Start Date</label>
                <input
                  className="usa-input"
                  type="date"
                  value={newForm.startDate}
                  onChange={(e) => setNewForm({ ...newForm, startDate: e.target.value })}
                  style={{ width: 150 }}
                />
              </div>
              <div>
                <label className="usa-label">End Date</label>
                <input
                  className="usa-input"
                  type="date"
                  value={newForm.endDate}
                  onChange={(e) => setNewForm({ ...newForm, endDate: e.target.value })}
                  style={{ width: 150 }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="usa-button usa-button--success"
                  onClick={submitAdd}
                  disabled={!newForm.resourceId || addAssignment.isPending}
                >
                  {addAssignment.isPending ? 'Saving...' : 'Save'}
                </button>
                <button className="usa-button usa-button--outline" onClick={() => { setShowAdd(false); setNewForm(EMPTY_NEW); }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <table className="usa-table">
          <thead>
            <tr>
              <th>Resource</th>
              <th>Role</th>
              <th>% Allocated</th>
              <th>Start</th>
              <th>End</th>
              {canEdit && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {project.assignments.map((a) => {
              const isEditing = editingId === a.id;
              return (
                <tr key={a.id}>
                  <td
                    style={{ fontWeight: 600, cursor: 'pointer', color: 'var(--usa-primary)' }}
                    onClick={() => !isEditing && navigate(`/resources/${a.resourceId}`)}
                  >
                    {a.resource ? `${a.resource.lastName}, ${a.resource.firstName}` : a.resourceId}
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
                            onClick={() => saveEdit(a.id)}
                            disabled={updateAssignment.isPending}
                          >
                            Save
                          </button>
                          <button
                            className="usa-button usa-button--outline"
                            style={{ padding: '4px 10px', fontSize: 13 }}
                            onClick={() => { setEditingId(null); setEditForm(EMPTY_EDIT); }}
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{a.role?.name || '-'}</td>
                      <td>{Math.round(a.percentUtilized * 100)}%</td>
                      <td>{a.startDate ? new Date(a.startDate).toLocaleDateString() : '-'}</td>
                      <td>{a.endDate ? new Date(a.endDate).toLocaleDateString() : '-'}</td>
                      {canEdit && (
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              className="usa-button usa-button--unstyled"
                              title="Edit assignment"
                              onClick={() => startEdit(a)}
                              style={{ color: 'var(--usa-primary)' }}
                            >
                              <Icon name="edit" size={16} color="var(--usa-primary)" />
                            </button>
                            <button
                              className="usa-button usa-button--unstyled"
                              title="Remove assignment"
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
            {project.assignments.length === 0 && (
              <tr>
                <td colSpan={colCount} style={{ textAlign: 'center', padding: 24 }}>
                  No team members assigned.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
