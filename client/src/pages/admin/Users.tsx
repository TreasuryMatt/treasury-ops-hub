import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/admin';
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
  isActive: boolean;
};

export function Users() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';
  const qc = useQueryClient();
  const { data: users, isLoading } = useQuery({ queryKey: ['admin-users'], queryFn: () => adminApi.users() });

  const [showAdd, setShowAdd] = useState(false);
  const [sortBy, setSortBy] = useState('displayName');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Edit modal state
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editValues, setEditValues] = useState<AdminUserForm>({
    displayName: '',
    email: '',
    caiaId: '',
    role: 'viewer',
    userType: 'staff',
    isIntakeReviewer: false,
    isResourceManager: false,
    isActive: true,
  });

  // Deactivate confirmation state
  const [pendingDeactivateUser, setPendingDeactivateUser] = useState<any | null>(null);

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
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => adminApi.createUser(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setShowAdd(false);
      setNewUser({ caiaId: '', email: '', displayName: '', role: 'viewer', userType: 'staff', isIntakeReviewer: false, isResourceManager: false });
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
      isActive: u.isActive,
    });
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
        <button className="usa-button usa-button--primary" onClick={() => setShowAdd(!showAdd)} style={{ marginBottom: 16 }}>
          <Icon name="person_add" color="white" size={16} /> Add User
        </button>
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
              {([['displayName', 'Display Name'], ['caiaId', 'CAIA ID'], ['email', 'Email'], ['role', 'Role'], ['isResourceManager', 'Resource Manager'], ['isIntakeReviewer', 'Reviewer'], ['isActive', 'Active']] as [string, string][]).map(([field, label]) => (
                <th key={field} style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }} onClick={() => handleSort(field)}>
                  {label} <SortIcon field={field} active={sortBy === field} dir={sortDir} />
                </th>
              ))}
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
                <td>{u.isResourceManager || u.role === 'manager' ? 'Yes' : 'No'}</td>
                <td>{u.isIntakeReviewer ? 'Yes' : 'No'}</td>
                <td>{u.isActive ? 'Yes' : 'No'}</td>
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
