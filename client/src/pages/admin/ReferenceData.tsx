import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/admin';
import { Icon } from '../../components/Icon';

type UsageItem = { label: string; count: number };

function ReferenceTable({ title, queryKey, fetchFn, createFn, updateFn, deleteFn, usageFn, fields }: {
  title: string;
  queryKey: string;
  fetchFn: () => Promise<any[]>;
  createFn: (data: any) => Promise<any>;
  updateFn: (id: string, data: any) => Promise<any>;
  deleteFn: (id: string) => Promise<any>;
  usageFn: (id: string) => Promise<UsageItem[]>;
  fields: Array<{ key: string; label: string }>;
}) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: [queryKey], queryFn: fetchFn });

  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingDeleteName, setPendingDeleteName] = useState('');
  const [usageItems, setUsageItems] = useState<UsageItem[]>([]);
  const [usageLoading, setUsageLoading] = useState(false);

  const createMutation = useMutation({
    mutationFn: createFn,
    onSuccess: () => { qc.invalidateQueries({ queryKey: [queryKey] }); setShowAdd(false); setNewItem({}); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateFn(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [queryKey] }); setEditingId(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFn(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [queryKey] }); setPendingDeleteId(null); setUsageItems([]); },
  });

  async function handleDeleteClick(item: any) {
    setUsageLoading(true);
    setPendingDeleteId(item.id);
    setPendingDeleteName(item.name);
    const usage = await usageFn(item.id);
    setUsageItems(usage);
    setUsageLoading(false);
  }

  function startEdit(item: any) {
    setEditingId(item.id);
    const vals: Record<string, string> = {};
    fields.forEach((f) => { vals[f.key] = item[f.key] ?? ''; });
    setEditValues(vals);
    setPendingDeleteId(null);
  }

  function cancelDelete() {
    setPendingDeleteId(null);
    setUsageItems([]);
  }

  const usageSummary = usageItems.map((i) => `${i.count} ${i.label}`).join(', ');

  return (
    <div className="detail-card" style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3>{title} ({data?.length ?? 0})</h3>
        <button className="usa-button usa-button--outline" onClick={() => { setShowAdd(!showAdd); setEditingId(null); setPendingDeleteId(null); }}>
          <Icon name="add" size={16} /> Add
        </button>
      </div>

      {showAdd && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {fields.map((f) => (
            <div key={f.key}>
              <label className="usa-label" style={{ fontSize: 12 }}>{f.label}</label>
              <input className="usa-input" value={newItem[f.key] || ''} onChange={(e) => setNewItem({ ...newItem, [f.key]: e.target.value })} style={{ minWidth: 120 }} />
            </div>
          ))}
          <button className="usa-button usa-button--success" onClick={() => createMutation.mutate(newItem)} disabled={createMutation.isPending}>Save</button>
          <button className="usa-button usa-button--outline" onClick={() => setShowAdd(false)}>Cancel</button>
        </div>
      )}

      {pendingDeleteId && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) cancelDelete(); }}>
          <div className="modal">
            <div className="modal__title">Delete "{pendingDeleteName}"?</div>
            <div className="modal__body">
              {usageLoading ? (
                <span>Checking usage…</span>
              ) : usageItems.length > 0 ? (
                <>This will clear it from <strong>{usageSummary}</strong>. This cannot be undone.</>
              ) : (
                <>This item is not currently in use. This cannot be undone.</>
              )}
            </div>
            <div className="modal__actions">
              <button className="usa-button usa-button--outline" onClick={cancelDelete}>Cancel</button>
              <button
                className="usa-button usa-button--danger"
                onClick={() => deleteMutation.mutate(pendingDeleteId)}
                disabled={deleteMutation.isPending || usageLoading}
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? <span className="usa-spinner" /> : (
        <table className="usa-table" style={{ fontSize: 14 }}>
          <thead>
            <tr>
              {fields.map((f) => <th key={f.key}>{f.label}</th>)}
              <th style={{ width: 80 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((item: any) => (
              <tr key={item.id}>
                {editingId === item.id ? (
                  <>
                    {fields.map((f) => (
                      <td key={f.key}>
                        <input
                          className="usa-input"
                          value={editValues[f.key] ?? ''}
                          onChange={(e) => setEditValues({ ...editValues, [f.key]: e.target.value })}
                          style={{ minWidth: 100, padding: '4px 8px', fontSize: 13 }}
                        />
                      </td>
                    ))}
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          className="usa-button usa-button--success usa-button--sm"
                          onClick={() => updateMutation.mutate({ id: item.id, data: editValues })}
                          disabled={updateMutation.isPending}
                        >
                          Save
                        </button>
                        <button className="usa-button usa-button--outline usa-button--sm" onClick={() => setEditingId(null)}>✕</button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    {fields.map((f) => <td key={f.key}>{item[f.key] ?? '-'}</td>)}
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className="usa-button usa-button--unstyled"
                          onClick={() => startEdit(item)}
                          title="Edit"
                          style={{ color: 'var(--usa-primary)' }}
                        >
                          <Icon name="edit" size={15} color="var(--usa-primary)" />
                        </button>
                        <button
                          className="usa-button usa-button--unstyled"
                          onClick={() => handleDeleteClick(item)}
                          title="Delete"
                          style={{ color: 'var(--usa-error)' }}
                        >
                          <Icon name="delete" size={15} color="var(--usa-error)" />
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function ReferenceData() {
  return (
    <div className="usa-page">
      <div className="usa-page-header">
        <h1 className="usa-page-title">Reference Data</h1>
        <p className="usa-page-subtitle">Manage roles, functional areas, and products</p>
      </div>

      <ReferenceTable
        title="Roles"
        queryKey="roles"
        fetchFn={adminApi.roles}
        createFn={adminApi.createRole}
        updateFn={adminApi.updateRole}
        deleteFn={adminApi.deleteRole}
        usageFn={adminApi.roleUsage}
        fields={[{ key: 'name', label: 'Name' }, { key: 'sortOrder', label: 'Sort Order' }]}
      />

      <ReferenceTable
        title="Functional Areas"
        queryKey="functional-areas"
        fetchFn={adminApi.functionalAreas}
        createFn={adminApi.createFunctionalArea}
        updateFn={adminApi.updateFunctionalArea}
        deleteFn={adminApi.deleteFunctionalArea}
        usageFn={adminApi.functionalAreaUsage}
        fields={[{ key: 'name', label: 'Name' }, { key: 'division', label: 'Division' }]}
      />

      <ReferenceTable
        title="Products"
        queryKey="products"
        fetchFn={adminApi.products}
        createFn={adminApi.createProduct}
        updateFn={adminApi.updateProduct}
        deleteFn={adminApi.deleteProduct}
        usageFn={adminApi.productUsage}
        fields={[{ key: 'name', label: 'Name' }, { key: 'description', label: 'Description' }]}
      />
    </div>
  );
}
