import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { productsApi } from '../../api/products';
import { useAuth } from '../../context/AuthContext';
import { Product, ProductType, ProductStatus } from '../../types';
import { Icon } from '../../components/Icon';

const ACCENTS = [
  '#005ea2', '#2e6276', '#1b4332', '#7b3f00', '#5c1a1a',
  '#3d4551', '#0e5f3f', '#4a1e6a', '#8b4513', '#1a3a5c',
];
function accentFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return ACCENTS[hash % ACCENTS.length];
}
function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

const TYPE_LABELS: Record<ProductType, string> = {
  PLATFORM: 'Platform',
  APPLICATION: 'Application',
  INTEGRATION: 'Integration',
  SERVICE: 'Service',
  MOBILE_APP: 'Mobile App',
};

const STATUS_COLORS: Record<ProductStatus, string> = {
  ACTIVE: 'var(--usa-success)',
  EVALUATING: 'var(--usa-info)',
  PLANNED: 'var(--usa-base)',
  DEPRECATED: 'var(--usa-warning-dark)',
  SUNSET: 'var(--usa-error)',
};

const STATUS_LABELS: Record<ProductStatus, string> = {
  ACTIVE: 'Active',
  EVALUATING: 'Evaluating',
  PLANNED: 'Planned',
  DEPRECATED: 'Deprecated',
  SUNSET: 'Sunset',
};

const CRITICALITY_COLORS: Record<string, string> = {
  LOW: '#6c757d',
  MEDIUM: 'var(--usa-warning-dark)',
  HIGH: 'var(--usa-error)',
  MISSION_CRITICAL: '#6f1f1f',
};

export function Products() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = user?.role === 'editor' || user?.role === 'manager' || user?.role === 'admin';

  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => productsApi.list(),
  });

  const filtered = products.filter((p) => {
    if (filterType && p.productType !== filterType) return false;
    if (filterStatus && p.productStatus !== filterStatus) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !(p.vendor || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (isLoading) {
    return <div className="page-loading"><span className="usa-spinner" aria-label="Loading" /> Loading...</div>;
  }

  return (
    <div className="usa-page">
      <div className="usa-page-header">
        <div>
          <h1 className="usa-page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="build" color="var(--usa-primary)" size={26} />
            Products
          </h1>
          <p className="usa-page-subtitle">{products.length} product{products.length !== 1 ? 's' : ''}</p>
        </div>
        {canEdit && (
          <button className="usa-button usa-button--outline usa-button--sm" onClick={() => navigate('/status/products/new')}>
            + New Product
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', flexWrap: 'wrap' }}>
        <input
          className="usa-input"
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 240 }}
        />
        <select className="usa-select" value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ maxWidth: 180 }}>
          <option value="">All Types</option>
          {(Object.keys(TYPE_LABELS) as ProductType[]).map((t) => (
            <option key={t} value={t}>{TYPE_LABELS[t]}</option>
          ))}
        </select>
        <select className="usa-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ maxWidth: 180 }}>
          <option value="">All Statuses</option>
          {(Object.keys(STATUS_LABELS) as ProductStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        {(filterType || filterStatus || search) && (
          <button className="usa-button usa-button--unstyled" onClick={() => { setFilterType(''); setFilterStatus(''); setSearch(''); }}>
            Clear filters
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon"><Icon name="build" size={48} /></div>
          <h3>{products.length === 0 ? 'No products yet' : 'No products match your filters'}</h3>
          {products.length === 0 && canEdit && (
            <button className="usa-button usa-button--outline usa-button--sm" onClick={() => navigate('/status/products/new')}>+ New Product</button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-3)' }}>
          {filtered.map((product) => {
            const accent = accentFor(product.name);
            const programNames = (product.programs ?? []).map((pp) => pp.program.name);
            return (
              <div
                key={product.id}
                className="detail-card"
                onClick={() => navigate(`/status/products/${product.id}`)}
                style={{ cursor: 'pointer', borderTop: `4px solid ${accent}`, display: 'flex', flexDirection: 'column' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                  {product.logoUrl ? (
                    <img src={product.logoUrl} alt="" style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 6, flexShrink: 0 }} />
                  ) : (
                    <div style={{
                      width: 40, height: 40, borderRadius: 6, background: accent, display: 'flex',
                      alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700,
                      fontSize: 14, flexShrink: 0,
                    }}>
                      {initials(product.name)}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.2, marginBottom: 4 }}>{product.name}</div>
                    {product.vendor && (
                      <div style={{ fontSize: 12, color: 'var(--usa-base-dark)', marginBottom: 2 }}>{product.vendor}</div>
                    )}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 10,
                        background: `${accent}22`, color: accent, whiteSpace: 'nowrap',
                      }}>
                        {TYPE_LABELS[product.productType]}
                      </span>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 10,
                        background: `${STATUS_COLORS[product.productStatus]}22`,
                        color: STATUS_COLORS[product.productStatus],
                        border: `1px solid ${STATUS_COLORS[product.productStatus]}55`,
                        whiteSpace: 'nowrap',
                      }}>
                        {STATUS_LABELS[product.productStatus]}
                      </span>
                    </div>
                  </div>
                </div>

                {product.description && (
                  <p style={{ fontSize: 13, color: 'var(--usa-base-dark)', margin: '0 0 10px', lineHeight: 1.4,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {product.description}
                  </p>
                )}

                <div style={{ display: 'flex', gap: 16, marginTop: 'auto', fontSize: 12, color: 'var(--usa-base-dark)' }}>
                  <span><Icon name="lightbulb" size={13} /> {product._count?.statusProjects ?? 0} project{(product._count?.statusProjects ?? 0) !== 1 ? 's' : ''}</span>
                  {(product._count?.childProducts ?? 0) > 0 && (
                    <span><Icon name="layers" size={13} /> {product._count!.childProducts} built on this</span>
                  )}
                  {product.criticality && product.criticality !== 'MEDIUM' && (
                    <span style={{ color: CRITICALITY_COLORS[product.criticality], fontWeight: 600 }}>
                      {product.criticality.replace('_', ' ')}
                    </span>
                  )}
                </div>

                {programNames.length > 0 && (
                  <div style={{ marginTop: 8, fontSize: 11, color: 'var(--usa-base-dark)' }}>
                    {programNames.slice(0, 2).join(' · ')}{programNames.length > 2 ? ` +${programNames.length - 2} more` : ''}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
