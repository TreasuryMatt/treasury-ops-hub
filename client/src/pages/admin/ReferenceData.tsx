import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/admin';
import { Icon } from '../../components/Icon';

function ReferenceTable({ title, queryKey, fetchFn, createFn, fields }: {
  title: string;
  queryKey: string;
  fetchFn: () => Promise<any[]>;
  createFn: (data: any) => Promise<any>;
  fields: Array<{ key: string; label: string }>;
}) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: [queryKey], queryFn: fetchFn });
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: createFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKey] });
      setShowAdd(false);
      setNewItem({});
    },
  });

  return (
    <div className="detail-card" style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3>{title} ({data?.length ?? 0})</h3>
        <button className="usa-button usa-button--outline" onClick={() => setShowAdd(!showAdd)}>
          <Icon name="add" size={16} /> Add
        </button>
      </div>

      {showAdd && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'flex-end' }}>
          {fields.map((f) => (
            <div key={f.key}>
              <label className="usa-label" style={{ fontSize: 12 }}>{f.label}</label>
              <input className="usa-input" value={newItem[f.key] || ''} onChange={(e) => setNewItem({ ...newItem, [f.key]: e.target.value })} style={{ minWidth: 120 }} />
            </div>
          ))}
          <button className="usa-button" onClick={() => mutation.mutate(newItem)} disabled={mutation.isPending}>Save</button>
          <button className="usa-button usa-button--outline" onClick={() => setShowAdd(false)}>Cancel</button>
        </div>
      )}

      {isLoading ? <span className="usa-spinner" /> : (
        <table className="usa-table" style={{ fontSize: 14 }}>
          <thead>
            <tr>
              {fields.map((f) => <th key={f.key}>{f.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {data?.map((item: any) => (
              <tr key={item.id}>
                {fields.map((f) => <td key={f.key}>{item[f.key] ?? '-'}</td>)}
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
        fields={[{ key: 'name', label: 'Name' }, { key: 'sortOrder', label: 'Sort Order' }]}
      />

      <ReferenceTable
        title="Functional Areas"
        queryKey="functional-areas"
        fetchFn={adminApi.functionalAreas}
        createFn={adminApi.createFunctionalArea}
        fields={[{ key: 'name', label: 'Name' }, { key: 'division', label: 'Division' }]}
      />

      <ReferenceTable
        title="Products"
        queryKey="products"
        fetchFn={adminApi.products}
        createFn={adminApi.createProduct}
        fields={[{ key: 'name', label: 'Name' }, { key: 'description', label: 'Description' }]}
      />
    </div>
  );
}
