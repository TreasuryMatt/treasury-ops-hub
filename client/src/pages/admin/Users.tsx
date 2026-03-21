import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/admin';
import { Icon } from '../../components/Icon';
import { SortIcon, SortDir } from '../../components/SortIcon';

export function Users() {
  const qc = useQueryClient();
  const { data: users, isLoading } = useQuery({ queryKey: ['admin-users'], queryFn: () => adminApi.users() });
  const [showAdd, setShowAdd] = useState(false);
  const [sortBy, setSortBy] = useState('displayName');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  function handleSort(field: string) {
    if (sortBy === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(field); setSortDir('asc'); }
  }

  const sortedUsers = [...(users ?? [])].sort((a: any, b: any) => {
    const av = a[sortBy] ?? '';
    const bv = b[sortBy] ?? '';
    return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });
  const [newUser, setNewUser] = useState({ caiaId: '', email: '', displayName: '', role: 'viewer' });

  const createMutation = useMutation({
    mutationFn: (data: any) => adminApi.createUser(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setShowAdd(false);
      setNewUser({ caiaId: '', email: '', displayName: '', role: 'viewer' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminApi.updateUser(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  return (
    <div className="usa-page">
      <div className="usa-page-header">
        <h1 className="usa-page-title">Users</h1>
        <p className="usa-page-subtitle">Manage application users and roles</p>
      </div>

      <button className="usa-button usa-button--primary" onClick={() => setShowAdd(!showAdd)} style={{ marginBottom: 16 }}>
        <Icon name="person_add" color="white" size={16} /> Add User
      </button>

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
            <button className="usa-button usa-button--primary" onClick={() => createMutation.mutate(newUser)}>Create</button>
            <button className="usa-button usa-button--outline" onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}

      {isLoading ? <span className="usa-spinner" /> : (
        <table className="usa-table">
          <thead>
            <tr>
              {([['displayName', 'Display Name'], ['caiaId', 'CAIA ID'], ['email', 'Email'], ['role', 'Role'], ['isActive', 'Active']] as [string, string][]).map(([field, label]) => (
                <th key={field} style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }} onClick={() => handleSort(field)}>
                  {label} <SortIcon field={field} active={sortBy === field} dir={sortDir} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedUsers.map((u: any) => (
              <tr key={u.id}>
                <td style={{ fontWeight: 600 }}>{u.displayName}</td>
                <td>{u.caiaId}</td>
                <td>{u.email}</td>
                <td>
                  <select
                    className="usa-select"
                    value={u.role}
                    onChange={(e) => updateMutation.mutate({ id: u.id, data: { role: e.target.value } })}
                    style={{ minWidth: 100 }}
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td>{u.isActive ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
