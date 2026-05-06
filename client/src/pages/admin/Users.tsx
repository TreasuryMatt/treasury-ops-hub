import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/admin';
import { resourcesApi } from '../../api/resources';
import { Icon } from '../../components/Icon';
import { SortIcon, SortDir } from '../../components/SortIcon';
import { useAuth } from '../../context/AuthContext';

type AdminUserForm = {
  displayName: string;
  email: string;
  caiaId: string;
  role: string;
  userType: 'staff' | 'customer';
  isIntakeReviewer: boolean;
  isResourceManager: boolean;
  isResourceRequestor: boolean;
  isActive: boolean;
};

export function Users() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';
  const qc = useQueryClient();
  const { data: users, isLoading } = useQuery({ queryKey: ['admin-users'], queryFn: () => adminApi.users() });

  const [showAdd, setShowAdd] = useState(false);
  const [sortBy, setSortBy] = useState('displayName');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editValues, setEditValues] = useState<AdminUserForm>({
    displayName: '',
    email: '',
    caiaId: '',
    role: 'viewer',
    userType: 'staff',
    isIntakeReviewer: false,
    isResourceManager: false,
    isResourceRequestor: false,
    isActive: true,
  });

  const [pendingDeactivateUser, setPendingDeactivateUser] = useState<any | null>(null);

  // Link resource modal
  const [linkingUser, setLinkingUser] = useState<any | null>(null);
  const [selectedResourceId, setSelectedResourceId] = useState('');
  const [pendingUnlinkUser, setPendingUnlinkUser] = useState<any | null>(null);

  const { data: allResourcesData } = useQuery({
    queryKey: ['resources-all-for-linking'],
    queryFn: () => resourcesApi.list({ limit: '1000' }),
    enabled: Boolean(linkingUser),
  });

  // Resources not yet linked to any user (or linked to this user)
  const linkableResources = (allResourcesData?.data ?? []).filter(
    (r: any) => !r.userId || r.userId === linkingUser?.id,
  );

  function handleSort(field: string) {
    if (sortBy === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(field); setSortDir('asc'); }
  }

  const sortedUsers = [...(users ?? [])].sort((a: any, b: any) => {
    const av = a[sortBy] ?? '';
    const bv = b[sortBy] ?? '';
    return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });

  const [newUser, setNewUser] = useState({
    caiaId: '',
    email: '',
    displayName: '',
    role: 'viewer',
    userType: 'staff' as 'staff' | 'customer',
    isIntakeReviewer: false,
    isResourceManager: false,
    isResourceRequestor: false,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => adminApi.createUser(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setShowAdd(false);
      setNewUser({ caiaId: '', email: '', displayName: '', role: 'viewer', userType: 'staff', isIntakeReviewer: false, isResourceManager: false, isResourceRequestor: false });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminApi.updateUser(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setEditingUser(null);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => adminApi.deactivateUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setPendingDeactivateUser(null);
    },
  });

  const linkMutation = useMutation({
    mutationFn: ({ resourceId, userId }: { resourceId: string; userId: string }) =>
      resourcesApi.update(resourceId, { userId } as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['resources-all-for-linking'] });
      setLinkingUser(null);
      setSelectedResourceId('');
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: (resourceId: string) => resourcesApi.update(resourceId, { userId: null } as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['resources-all-for-linking'] });
      setPendingUnlinkUser(null);
    },
  });

  function openEdit(u: any) {
    setEditingUser(u);
    setEditValues({
      displayName: u.displayName,
      email: u.email,
      caiaId: u.caiaId,
      role: u.role === 'manager' ? 'viewer' : u.role,
      userType: u.userType || 'staff',
      isIntakeReviewer: Boolean(u.isIntakeReviewer),
      isResourceManager: Boolean(u.isResourceManager || u.role === 'manager'),
      isResourceRequestor: Boolean(u.isResourceRequestor),
      isActive: u.isActive,
    });
  }

  function openLinkModal(u: any) {
    setLinkingUser(u);
    setSelectedResourceId('');
  }

  return (
    <div className="usa-page">
      <div className="usa-page-header">
        <h1 className="usa-page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="group_add" color="var(--usa-base-dark)" size={26} />
          Users
        </h1>
        <p className="usa-page-subtitle">Manage application users and roles</p>
      </div>

      {isAdmin && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button className="usa-button usa-button--primary" onClick={() => navigate('/admin/onboard-staff')}>
            <Icon name="person_add" color="white" size={16} /> Onboard Staff Member
          </button>
          <button className="usa-button usa-button--outline" onClick={() => setShowAdd(!showAdd)}>
            <Icon name="add" size={16} /> Add User Only
          </button>
        </div>
      )}

      {showAdd && (
        <div className="detail-card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label className="usa-label">CAIA ID</label>
              <input className="usa-input" value={newUser.caiaId} onChange={(e) => setNewUser({ ...newUser, caiaId: e.target.value })} />
            </div>
            <div>
              <label className="usa-label">Display Name</label>
              <input className="usa-input" value={newUser.displayName} onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })} />
            </div>
            <div>
              <label className="usa-label">Email</label>
              <input className="usa-input" type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
            </div>
            <div>
              <label className="usa-label">Role</label>
              <select className="usa-select" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="usa-label">User Type</label>
              <select className="usa-select" value={newUser.userType} onChange={(e) => setNewUser({ ...newUser, userType: e.target.value as 'staff' | 'customer' })}>
                <option value="staff">Staff</option>
                <option value="customer">Customer</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 8 }}>
              <input
                id="new-isIntakeReviewer"
                type="checkbox"
                className="usa-checkbox__input"
                checked={newUser.isIntakeReviewer}
                onChange={(e) => setNewUser({ ...newUser, isIntakeReviewer: e.target.checked })}
              />
              <label htmlFor="new-isIntakeReviewer" className="usa-checkbox__label">Intake Reviewer</label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 8 }}>
              <input
                id="new-isResourceManager"
                type="checkbox"
                className="usa-checkbox__input"
                checked={newUser.isResourceManager}
                onChange={(e) => setNewUser({ ...newUser, isResourceManager: e.target.checked })}
              />
              <label htmlFor="new-isResourceManager" className="usa-checkbox__label">Resource Manager</label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 8 }}>
              <input
                id="new-isResourceRequestor"
                type="checkbox"
                className="usa-checkbox__input"
                checked={newUser.isResourceRequestor}
                onChange={(e) => setNewUser({ ...newUser, isResourceRequestor: e.target.checked })}
              />
              <label htmlFor="new-isResourceRequestor" className="usa-checkbox__label">Resource Requestor</label>
            </div>
            <button className="usa-button usa-button--success" disabled={createMutation.isPending} onClick={() => createMutation.mutate(newUser)}>
              {createMutation.isPending ? 'Creating…' : 'Create'}
            </button>
            <button className="usa-button usa-button--outline" onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}

      {isLoading ? <span className="usa-spinner" /> : (
        <table className="usa-table">
          <thead>
            <tr>
              {([['displayName', 'Display Name'], ['caiaId', 'CAIA ID'], ['email', 'Email'], ['role', 'Role'], ['isIntakeReviewer', 'Reviewer'], ['isActive', 'Active']] as [string, string][]).map(([field, label]) => (
                <th key={field} style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }} onClick={() => handleSort(field)}>
                  {label} <SortIcon field={field} active={sortBy === field} dir={sortDir} />
                </th>
              ))}
              <th style={{ whiteSpace: 'nowrap' }}>Linked Resource</th>
              {isAdmin && <th style={{ whiteSpace: 'nowrap' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {sortedUsers.map((u: any) => (
              <tr key={u.id} style={{ opacity: u.isActive ? 1 : 0.5 }}>
                <td style={{ fontWeight: 600 }}>{u.displayName}</td>
                <td>{u.caiaId}</td>
                <td>{u.email}</td>
                <td style={{ textTransform: 'capitalize' }}>{u.role === 'manager' ? 'viewer' : u.role}</td>
                <td>{u.isIntakeReviewer ? 'Yes' : 'No'}</td>
                <td>{u.isActive ? 'Yes' : 'No'}</td>
                <td>
                  {u.resource ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{ color: 'var(--usa-primary)', cursor: 'pointer', textDecoration: 'underline' }}
                        onClick={() => navigate(`/staffing/resources/${u.resource.id}`)}
                      >
                        {u.resource.lastName}, {u.resource.firstName}
                      </span>
                      {isAdmin && (
                        <button
                          className="usa-button usa-button--unstyled"
                          title="Unlink resource"
                          onClick={() => setPendingUnlinkUser(u)}
                          style={{ color: 'var(--usa-base-light)', marginLeft: 2 }}
                        >
                          <Icon name="link_off" size={14} />
                        </button>
                      )}
                    </span>
                  ) : (
                    isAdmin ? (
                      <button
                        className="usa-button usa-button--unstyled"
                        style={{ fontSize: 13, color: 'var(--usa-primary)' }}
                        onClick={() => openLinkModal(u)}
                      >
                        <Icon name="link" size={14} /> Link resource
                      </button>
                    ) : (
                      <span style={{ color: 'var(--usa-base-light)', fontSize: 13 }}>None</span>
                    )
                  )}
                </td>
                {isAdmin && (
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button
                      className="usa-button usa-button--unstyled"
                      title="Edit user"
                      onClick={() => openEdit(u)}
                      style={{ marginRight: 8 }}
                    >
                      <Icon name="edit" size={16} />
                    </button>
                    {u.isActive && (
                      <button
                        className="usa-button usa-button--unstyled"
                        title="Deactivate user"
                        onClick={() => setPendingDeactivateUser(u)}
                        style={{ color: 'var(--usa-error)' }}
                      >
                        <Icon name="person_off" size={16} />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ── Edit User Modal ─────────────────────────────────── */}
      {editingUser && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setEditingUser(null); }}>
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal__title">Edit User</div>
            <div className="modal__body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="usa-label" style={{ marginTop: 0 }}>Display Name</label>
                  <input
                    className="usa-input"
                    value={editValues.displayName}
                    onChange={(e) => setEditValues({ ...editValues, displayName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="usa-label" style={{ marginTop: 0 }}>Email</label>
                  <input
                    className="usa-input"
                    type="email"
                    value={editValues.email}
                    onChange={(e) => setEditValues({ ...editValues, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="usa-label" style={{ marginTop: 0 }}>CAIA ID</label>
                  <input
                    className="usa-input"
                    value={editValues.caiaId}
                    onChange={(e) => setEditValues({ ...editValues, caiaId: e.target.value })}
                  />
                </div>
                <div>
                  <label className="usa-label" style={{ marginTop: 0 }}>Role</label>
                  <select
                    className="usa-select"
                    value={editValues.role}
                    onChange={(e) => setEditValues({ ...editValues, role: e.target.value })}
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="usa-label" style={{ marginTop: 0 }}>User Type</label>
                  <select
                    className="usa-select"
                    value={editValues.userType}
                    onChange={(e) => setEditValues({ ...editValues, userType: e.target.value as 'staff' | 'customer' })}
                  >
                    <option value="staff">Staff</option>
                    <option value="customer">Customer</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 24 }}>
                  <input
                    id="edit-isIntakeReviewer"
                    type="checkbox"
                    className="usa-checkbox__input"
                    checked={editValues.isIntakeReviewer}
                    onChange={(e) => setEditValues({ ...editValues, isIntakeReviewer: e.target.checked })}
                  />
                  <label htmlFor="edit-isIntakeReviewer" className="usa-checkbox__label">Intake Reviewer</label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 24 }}>
                  <input
                    id="edit-isResourceManager"
                    type="checkbox"
                    className="usa-checkbox__input"
                    checked={editValues.isResourceManager}
                    onChange={(e) => setEditValues({ ...editValues, isResourceManager: e.target.checked })}
                  />
                  <label htmlFor="edit-isResourceManager" className="usa-checkbox__label">Resource Manager</label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 24 }}>
                  <input
                    id="edit-isResourceRequestor"
                    type="checkbox"
                    className="usa-checkbox__input"
                    checked={editValues.isResourceRequestor}
                    onChange={(e) => setEditValues({ ...editValues, isResourceRequestor: e.target.checked })}
                  />
                  <label htmlFor="edit-isResourceRequestor" className="usa-checkbox__label">Resource Requestor</label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 24 }}>
                  <input
                    id="edit-isActive"
                    type="checkbox"
                    className="usa-checkbox__input"
                    checked={editValues.isActive}
                    onChange={(e) => setEditValues({ ...editValues, isActive: e.target.checked })}
                  />
                  <label htmlFor="edit-isActive" className="usa-checkbox__label">Active</label>
                </div>
              </div>
            </div>
            <div className="modal__actions">
              <button className="usa-button usa-button--outline" onClick={() => setEditingUser(null)}>Cancel</button>
              <button
                className="usa-button usa-button--success"
                disabled={updateMutation.isPending}
                onClick={() => updateMutation.mutate({ id: editingUser.id, data: editValues })}
              >
                {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Link Resource Modal ─────────────────────────────── */}
      {linkingUser && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setLinkingUser(null); setSelectedResourceId(''); } }}>
          <div className="modal" style={{ maxWidth: 460 }}>
            <div className="modal__title">Link Resource — {linkingUser.displayName}</div>
            <div className="modal__body">
              <p style={{ marginTop: 0, marginBottom: 12, fontSize: 14 }}>
                Select the staffing record to link to this user account. Only unlinked resources are shown.
              </p>
              <label className="usa-label" style={{ marginTop: 0 }}>Resource</label>
              <select
                className="usa-select"
                value={selectedResourceId}
                onChange={(e) => setSelectedResourceId(e.target.value)}
              >
                <option value="">— Select a resource —</option>
                {linkableResources.map((r: any) => (
                  <option key={r.id} value={r.id}>
                    {r.lastName}, {r.firstName} ({r.division})
                  </option>
                ))}
              </select>
              {linkableResources.length === 0 && !allResourcesData && (
                <p style={{ fontSize: 13, color: 'var(--usa-base-light)', marginTop: 8 }}>Loading resources…</p>
              )}
              {linkableResources.length === 0 && allResourcesData && (
                <p style={{ fontSize: 13, color: 'var(--usa-base-light)', marginTop: 8 }}>No unlinked resources available.</p>
              )}
              {linkMutation.isError && (
                <p style={{ color: 'var(--usa-error)', fontSize: 13, marginTop: 8 }}>
                  Failed to link resource. Please try again.
                </p>
              )}
            </div>
            <div className="modal__actions">
              <button className="usa-button usa-button--outline" onClick={() => { setLinkingUser(null); setSelectedResourceId(''); }}>Cancel</button>
              <button
                className="usa-button usa-button--primary"
                disabled={!selectedResourceId || linkMutation.isPending}
                onClick={() => linkMutation.mutate({ resourceId: selectedResourceId, userId: linkingUser.id })}
              >
                {linkMutation.isPending ? 'Linking…' : 'Link Resource'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Unlink Confirmation Modal ───────────────────────── */}
      {pendingUnlinkUser && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setPendingUnlinkUser(null); }}>
          <div className="modal">
            <div className="modal__title">Unlink Resource?</div>
            <div className="modal__body">
              Remove the link between <strong>{pendingUnlinkUser.displayName}</strong> and{' '}
              <strong>{pendingUnlinkUser.resource?.lastName}, {pendingUnlinkUser.resource?.firstName}</strong>?
              The user account and staffing record will both remain; only the connection between them will be removed.
            </div>
            <div className="modal__actions">
              <button className="usa-button usa-button--outline" onClick={() => setPendingUnlinkUser(null)}>Cancel</button>
              <button
                className="usa-button usa-button--danger"
                disabled={unlinkMutation.isPending}
                onClick={() => unlinkMutation.mutate(pendingUnlinkUser.resource.id)}
              >
                {unlinkMutation.isPending ? 'Unlinking…' : 'Unlink'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Deactivate Confirmation Modal ───────────────────── */}
      {pendingDeactivateUser && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setPendingDeactivateUser(null); }}>
          <div className="modal">
            <div className="modal__title">Deactivate "{pendingDeactivateUser.displayName}"?</div>
            <div className="modal__body">
              This user will no longer be able to log in. Their data and history will be preserved. This can be reversed by editing the user and re-enabling them.
            </div>
            <div className="modal__actions">
              <button className="usa-button usa-button--outline" onClick={() => setPendingDeactivateUser(null)}>Cancel</button>
              <button
                className="usa-button usa-button--danger"
                disabled={deactivateMutation.isPending}
                onClick={() => deactivateMutation.mutate(pendingDeactivateUser.id)}
              >
                {deactivateMutation.isPending ? 'Deactivating…' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
