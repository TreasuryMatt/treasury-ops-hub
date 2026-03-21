import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { projectsApi } from '../api/projects';
import { adminApi } from '../api/admin';
import { useAuth } from '../context/AuthContext';
import { Icon } from '../components/Icon';

const STATUS_LABELS: Record<string, string> = {
  in_progress: 'In Progress',
  on_hold: 'On Hold',
  completed: 'Completed',
};

export function Projects() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [productId, setProductId] = useState('');
  const [page, setPage] = useState(1);

  const params: Record<string, string> = { page: String(page), limit: '50' };
  if (search) params.search = search;
  if (status) params.status = status;
  if (priority) params.priority = priority;
  if (productId) params.productId = productId;

  const { data, isLoading } = useQuery({
    queryKey: ['projects', params],
    queryFn: () => projectsApi.list(params),
  });

  const { data: products } = useQuery({ queryKey: ['products'], queryFn: () => adminApi.products() });

  return (
    <div className="usa-page">
      <div className="usa-page-header">
        <h1 className="usa-page-title">Projects</h1>
        <p className="usa-page-subtitle">{data?.meta.total ?? '...'} total projects</p>
      </div>

      <div className="filter-bar">
        <div className="filter-bar__search">
          <Icon name="search" color="var(--usa-base)" />
          <input
            className="usa-input"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className="usa-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          <option value="in_progress">In Progress</option>
          <option value="on_hold">On Hold</option>
          <option value="completed">Completed</option>
        </select>
        <select className="usa-select" value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }}>
          <option value="">All Priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select className="usa-select" value={productId} onChange={(e) => { setProductId(e.target.value); setPage(1); }}>
          <option value="">All Products</option>
          {products?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {(user?.role === 'editor' || user?.role === 'admin') && (
          <button className="usa-button" onClick={() => navigate('/projects/new')}>
            <Icon name="add" color="white" /> Add Project
          </button>
        )}
      </div>

      {isLoading ? (
        <span className="usa-spinner" aria-label="Loading" />
      ) : (
        <>
          <table className="usa-table">
            <thead>
              <tr>
                <th>Project Name</th>
                <th>Product</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Team Size</th>
              </tr>
            </thead>
            <tbody>
              {data?.data.map((p) => (
                <tr key={p.id} onClick={() => navigate(`/projects/${p.id}`)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td>{p.product?.name || '-'}</td>
                  <td>
                    <span className={`status-badge status-badge--${p.status}`}>
                      {STATUS_LABELS[p.status] || p.status}
                    </span>
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{p.priority || '-'}</td>
                  <td>{p.startDate ? new Date(p.startDate).toLocaleDateString() : '-'}</td>
                  <td>{p.endDate ? new Date(p.endDate).toLocaleDateString() : '-'}</td>
                  <td>{p.teamSize}</td>
                </tr>
              ))}
              {data?.data.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32 }}>No projects found.</td></tr>
              )}
            </tbody>
          </table>

          {data && data.meta.pages > 1 && (
            <div className="pagination">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="usa-button usa-button--outline">Previous</button>
              <span>Page {page} of {data.meta.pages}</span>
              <button disabled={page >= data.meta.pages} onClick={() => setPage(page + 1)} className="usa-button usa-button--outline">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
