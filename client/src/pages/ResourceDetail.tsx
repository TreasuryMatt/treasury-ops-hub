import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { resourcesApi } from '../api/resources';
import { assignmentsApi } from '../api/assignments';
import { adminApi } from '../api/admin';
import { projectsApi } from '../api/projects';
import { useAuth } from '../context/AuthContext';
import { Icon } from '../components/Icon';
import { formatDivision } from '../utils/format';

export function ResourceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const canEdit = user?.role === 'editor' || user?.role === 'admin';

  const { data: resource, isLoading } = useQuery({
    queryKey: ['resource', id],
    queryFn: () => resourcesApi.get(id!),
  });

  const { data: roles } = useQuery({ queryKey: ['roles'], queryFn: () => adminApi.roles() });
  const { data: products } = useQuery({ queryKey: ['products'], queryFn: () => adminApi.products() });
  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list({ limit: '200' }).then((r) => r.data),
  });

  const [showAdd, setShowAdd] = useState(false);
  const [newAssignment, setNewAssignment] = useState({ projectId: '', roleId: '', percentUtilized: '' });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({
    projectId: '', roleId: '', percentUtilized: '', startDate: '', endDate: '', notes: '',
  });

  const removeAssignment = useMutation({
    mutationFn: (aId: string) => assignmentsApi.remove(aId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resource', id] }),
  });

  const updateAssignment = useMutation({
    mutationFn: ({ aId, data }: { aId: string; data: any }) => assignmentsApi.update(aId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resource', id] });
      setEditingId(null);
    },
  });

  const startEdit = (a: any) => {
    setEditingId(a.id);
    setEditValues({
      projectId: a.projectId,
      roleId: a.roleId ?? '',
      percentUtilized: String(Math.round(a.percentUtilized * 100)),
      startDate: a.startDate ? new Date(a.startDate).toISOString().split('T')[0] : '',
      endDate: a.endDate ? new Date(a.endDate).toISOString().split('T')[0] : '',
      notes: a.notes ?? '',
    });
  };

  if (isLoading || !resource) {
    return <div className="usa-page"><span className="usa-spinner" aria-label="Loading" /></div>;
  }

  const utilizationPct = Math.round(resource.totalPercentUtilized * 100);
  const capacityPct = Math.round(resource.availableCapacity * 100);

  return (
    <div className="usa-page">
      <div className="usa-page-header">
        <button className="usa-button usa-button--unstyled" onClick={() => navigate('/staffing/resources')} style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Icon name="arrow_back" size={16} /> Back to Resources
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div>
            <h1 className="usa-page-title">{resource.lastName}, {resource.firstName}</h1>
            <p className="usa-page-subtitle">
              <span className={`badge badge--${resource.resourceType}`}>{resource.resourceType === 'federal' ? 'Federal' : 'Contractor'}</span>
              {' '}{resource.primaryRole?.name || 'No role assigned'}
            </p>
          </div>
          {canEdit && (
            <button className="usa-button usa-button--outline" onClick={() => navigate(`/staffing/resources/${id}/edit`)}>
              <Icon name="edit" size={16} /> Edit
            </button>
          )}
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-card">
          <h3>Details</h3>
          <dl className="detail-list">
            <dt>Division</dt><dd>{formatDivision(resource.division)}</dd>
            <dt>Functional Area</dt><dd>{resource.functionalArea?.name || '-'}</dd>
            {resource.resourceType === 'federal' && (<><dt>GS Level</dt><dd>{resource.gsLevel || '-'}</dd></>)}
            {resource.resourceType === 'federal' && (<><dt>Matrixed</dt><dd>{resource.isMatrixed ? 'Yes' : 'No'}</dd></>)}
            {resource.resourceType === 'contractor' && (<><dt>POP Start</dt><dd>{resource.popStartDate ? new Date(resource.popStartDate).toLocaleDateString() : '-'}</dd></>)}
            {resource.resourceType === 'contractor' && (<><dt>POP End</dt><dd>{resource.popEndDate ? new Date(resource.popEndDate).toLocaleDateString() : '-'}</dd></>)}
            <dt>Secondary Role</dt><dd>{resource.secondaryRole?.name || '-'}</dd>
            <dt>Supervisor</dt><dd>{resource.supervisor ? `${resource.supervisor.lastName}, ${resource.supervisor.firstName}` : '-'}</dd>
            <dt>2nd Line Supervisor</dt><dd>{resource.secondLineSupervisor ? `${resource.secondLineSupervisor.lastName}, ${resource.secondLineSupervisor.firstName}` : '-'}</dd>
            <dt>Ops/Eng Lead</dt><dd>{resource.opsEngLead || '-'}</dd>
          </dl>
        </div>

        <div className="detail-card">
          <h3>Capacity</h3>
          <div style={{ fontSize: 36, fontWeight: 700, color: utilizationPct > 100 ? 'var(--usa-error)' : 'var(--usa-primary)' }}>
            {utilizationPct}%
          </div>
          <div style={{ fontSize: 14, color: 'var(--usa-base)' }}>Total Utilization</div>
          <div style={{ marginTop: 12, fontSize: 24, fontWeight: 600, color: capacityPct > 0 ? 'var(--usa-success)' : 'var(--usa-error)' }}>
            {capacityPct}%
          </div>
          <div style={{ fontSize: 14, color: 'var(--usa-base)' }}>Available Capacity</div>
          {resource.availableForWork && (
            <div className="badge badge--available" style={{ marginTop: 12 }}>Available for Work</div>
          )}
        </div>
      </div>

      {resource.notes && (
        <div className="detail-card" style={{ marginTop: 16 }}>
          <h3>Notes</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>{resource.notes}</p>
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: 18 }}>Assignments ({resource.assignments.length})</h2>
          {canEdit && (
            <button className="usa-button usa-button--outline" onClick={() => setShowAdd(!showAdd)}>
              <Icon name="add" size={16} /> Add Assignment
            </button>
          )}
        </div>

        {showAdd && (
          <div className="detail-card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div>
                <label className="usa-label">Project</label>
                <select className="usa-select" value={newAssignment.projectId} onChange={(e) => setNewAssignment({ ...newAssignment, projectId: e.target.value })}>
                  <option value="">Select project</option>
                  {projects?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="usa-label">Role</label>
                <select className="usa-select" value={newAssignment.roleId} onChange={(e) => setNewAssignment({ ...newAssignment, roleId: e.target.value })}>
                  <option value="">Select role</option>
                  {roles?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="usa-label">% Utilized</label>
                <input className="usa-input" type="number" min="0" max="100" step="5" placeholder="50" value={newAssignment.percentUtilized} onChange={(e) => setNewAssignment({ ...newAssignment, percentUtilized: e.target.value })} style={{ width: 80 }} />
              </div>
              <button className="usa-button usa-button--success" onClick={async () => {
                await assignmentsApi.create({
                  resourceId: id,
                  projectId: newAssignment.projectId,
                  roleId: newAssignment.roleId || undefined,
                  percentUtilized: parseFloat(newAssignment.percentUtilized) / 100 || 0,
                } as any);
                qc.invalidateQueries({ queryKey: ['resource', id] });
                setShowAdd(false);
                setNewAssignment({ projectId: '', roleId: '', percentUtilized: '' });
              }}>Save</button>
              <button className="usa-button usa-button--outline" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        )}

        <table className="usa-table">
          <thead>
            <tr>
              <th>Project</th>
              <th>Application</th>
              <th>Role</th>
              <th>% Utilized</th>
              <th>Start</th>
              <th>End</th>
              {canEdit && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {resource.assignments.map((a) => (
              editingId === a.id ? (
                <tr key={a.id}>
                  <td>
                    <select className="usa-select" value={editValues.projectId} onChange={(e) => setEditValues({ ...editValues, projectId: e.target.value })} style={{ minWidth: 140 }}>
                      <option value="">Select project</option>
                      {projects?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </td>
                  <td style={{ color: 'var(--usa-base)', fontSize: 13 }}>
                    {projects?.find((p: any) => p.id === editValues.projectId)?.product?.name || '-'}
                  </td>
                  <td>
                    <select className="usa-select" value={editValues.roleId} onChange={(e) => setEditValues({ ...editValues, roleId: e.target.value })} style={{ minWidth: 120 }}>
                      <option value="">Select role</option>
                      {roles?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </td>
                  <td>
                    <input className="usa-input" type="number" min="0" max="100" step="5" value={editValues.percentUtilized} onChange={(e) => setEditValues({ ...editValues, percentUtilized: e.target.value })} style={{ width: 70 }} />
                  </td>
                  <td>
                    <input className="usa-input" type="date" value={editValues.startDate} onChange={(e) => setEditValues({ ...editValues, startDate: e.target.value })} style={{ width: 130 }} />
                  </td>
                  <td>
                    <input className="usa-input" type="date" value={editValues.endDate} onChange={(e) => setEditValues({ ...editValues, endDate: e.target.value })} style={{ width: 130 }} />
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button
                      className="usa-button usa-button--success"
                      style={{ fontSize: 13, padding: '4px 12px', marginRight: 6 }}
                      disabled={updateAssignment.isPending}
                      onClick={() => updateAssignment.mutate({
                        aId: a.id,
                        data: {
                          projectId: editValues.projectId,
                          roleId: editValues.roleId || undefined,
                          percentUtilized: parseFloat(editValues.percentUtilized) / 100 || 0,
                          startDate: editValues.startDate || null,
                          endDate: editValues.endDate || null,
                          notes: editValues.notes || null,
                        },
                      })}
                    >
                      {updateAssignment.isPending ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      className="usa-button usa-button--outline"
                      style={{ fontSize: 13, padding: '4px 12px' }}
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={a.id}>
                  <td style={{ fontWeight: 600 }}>{a.project?.name || a.projectId}</td>
                  <td>{a.project?.product?.name || '-'}</td>
                  <td>{a.role?.name || '-'}</td>
                  <td>{Math.round(a.percentUtilized * 100)}%</td>
                  <td>{a.startDate ? new Date(a.startDate).toLocaleDateString() : '-'}</td>
                  <td>{a.endDate ? new Date(a.endDate).toLocaleDateString() : '-'}</td>
                  {canEdit && (
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button
                        className="usa-button usa-button--unstyled"
                        onClick={() => startEdit(a)}
                        style={{ marginRight: 8 }}
                        title="Edit assignment"
                      >
                        <Icon name="edit" size={16} />
                      </button>
                      <button
                        className="usa-button usa-button--unstyled"
                        onClick={() => removeAssignment.mutate(a.id)}
                        style={{ color: 'var(--usa-error)' }}
                        title="Delete assignment"
                      >
                        <Icon name="delete" size={16} color="var(--usa-error)" />
                      </button>
                    </td>
                  )}
                </tr>
              )
            ))}
            {resource.assignments.length === 0 && (
              <tr><td colSpan={canEdit ? 7 : 6} style={{ textAlign: 'center', padding: 24 }}>No assignments yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
