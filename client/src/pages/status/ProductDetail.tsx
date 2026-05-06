import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '../../api/products';
import { useAuth } from '../../context/AuthContext';
import { Product, ProductType, ProductStatus } from '../../types';
import { Icon } from '../../components/Icon';
import { RagBadge } from '../../components/RagBadge';

const TYPE_LABELS: Record<ProductType, string> = {
  PLATFORM: 'Platform', APPLICATION: 'Application', INTEGRATION: 'Integration',
  SERVICE: 'Service', MOBILE_APP: 'Mobile App',
};
const STATUS_LABELS: Record<ProductStatus, string> = {
  ACTIVE: 'Active', EVALUATING: 'Evaluating', PLANNED: 'Planned',
  DEPRECATED: 'Deprecated', SUNSET: 'Sunset',
};
const STATUS_COLORS: Record<ProductStatus, string> = {
  ACTIVE: 'var(--usa-success)', EVALUATING: 'var(--usa-info)', PLANNED: 'var(--usa-base)',
  DEPRECATED: 'var(--usa-warning-dark)', SUNSET: 'var(--usa-error)',
};
const HOSTING_LABELS: Record<string, string> = {
  SAAS: 'SaaS', ON_PREM: 'On-Premises', HYBRID: 'Hybrid',
  GOVT_CLOUD: 'Government Cloud', INTERNAL_HOSTED: 'Internal Hosted',
};
const ATO_COLORS: Record<string, string> = {
  AUTHORIZED: 'var(--usa-success)', PENDING: 'var(--usa-warning-dark)',
  EXPIRED: 'var(--usa-error)', NOT_REQUIRED: 'var(--usa-base)',
};
const FEDRAMP_LABELS: Record<string, string> = {
  LOW: 'FedRAMP Low', MODERATE: 'FedRAMP Moderate',
  HIGH: 'FedRAMP High', NOT_APPLICABLE: 'Not Applicable',
};
const CLASSIFICATION_COLORS: Record<string, string> = {
  PUBLIC: 'var(--usa-success)', SENSITIVE: 'var(--usa-warning-dark)', RESTRICTED: 'var(--usa-error)',
};

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{ marginBottom: 'var(--space-2)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--usa-base-dark)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14 }}>{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 'var(--space-4)' }}>
      <h2 className="section-title" style={{ marginBottom: 'var(--space-2)' }}>{title}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-2)' }}>
        {children}
      </div>
    </div>
  );
}

export function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = user?.role === 'editor' || user?.role === 'manager' || user?.role === 'admin';

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ['product', id],
    queryFn: () => productsApi.get(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return <div className="page-loading"><span className="usa-spinner" aria-label="Loading" /> Loading...</div>;
  }
  if (!product) return <div className="usa-page"><p>Product not found.</p></div>;

  const programNames = (product.programs ?? []).map((pp) => pp.program.name);

  return (
    <div className="usa-page">
      <div className="usa-page-header">
        <button
          className="usa-button usa-button--unstyled"
          onClick={() => navigate('/status/products')}
          style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <Icon name="arrow_back" size={16} /> Back to Products
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div>
            <h1 className="usa-page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {product.logoUrl ? (
                <img src={product.logoUrl} alt="" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 6, flexShrink: 0 }} />
              ) : (
                <div style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--usa-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                  {product.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
                </div>
              )}
              {product.name}
            </h1>
            <p className="usa-page-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'var(--usa-primary-lighter)', color: 'var(--usa-primary-dark)' }}>
                {TYPE_LABELS[product.productType]}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: `${STATUS_COLORS[product.productStatus]}22`, color: STATUS_COLORS[product.productStatus], border: `1px solid ${STATUS_COLORS[product.productStatus]}55` }}>
                {STATUS_LABELS[product.productStatus]}
              </span>
              {product.isInternal && (
                <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#e8f0fe', color: '#1a56db' }}>Internal</span>
              )}
              {product.vendor && <span style={{ color: 'var(--usa-base-dark)' }}>{product.vendor}</span>}
              {programNames.length > 0 && <span style={{ color: 'var(--usa-base-dark)' }}>{programNames.join(', ')}</span>}
            </p>
          </div>
          {canEdit && (
            <button className="usa-button usa-button--outline" style={{ flexShrink: 0 }} onClick={() => navigate(`/status/products/${id}/edit`)}>
              <Icon name="edit" size={16} /> Edit
            </button>
          )}
        </div>
      </div>

      {product.description && (
        <p style={{ marginBottom: 'var(--space-3)', color: 'var(--usa-base-dark)', maxWidth: 700 }}>{product.description}</p>
      )}

      {/* Quick links */}
      {(product.primaryUrl || product.documentationUrl) && (
        <div style={{ display: 'flex', gap: 'var(--space-1)', marginBottom: 'var(--space-3)' }}>
          {product.primaryUrl && (
            <a href={product.primaryUrl} target="_blank" rel="noopener noreferrer" className="usa-button usa-button--outline usa-button--sm">
              <Icon name="open_in_new" size={14} /> Open Product
            </a>
          )}
          {product.documentationUrl && (
            <a href={product.documentationUrl} target="_blank" rel="noopener noreferrer" className="usa-button usa-button--unstyled" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon name="menu_book" size={14} /> Documentation
            </a>
          )}
        </div>
      )}

      <Section title="Overview">
        <Field label="Vendor" value={product.vendor} />
        <Field label="Version" value={product.version} />
        <Field label="Type" value={TYPE_LABELS[product.productType]} />
        <Field label="Hosting" value={product.hostingModel ? HOSTING_LABELS[product.hostingModel] : null} />
        <Field label="Criticality" value={product.criticality?.replace('_', ' ')} />
        <Field label="Users" value={product.userCount?.toLocaleString()} />
      </Section>

      <Section title="Ownership">
        <Field label="Federal Product Owner" value={product.productOwner} />
        <Field label="Technical Owner" value={product.technicalOwner} />
      </Section>

      <Section title="Contract & Cost">
        <Field label="Annual Cost" value={product.annualCost != null ? `$${Number(product.annualCost).toLocaleString()}` : null} />
        <Field label="Contract Expiry" value={product.contractExpiry ? new Date(product.contractExpiry).toLocaleDateString() : null} />
      </Section>

      <Section title="Compliance">
        {product.atoStatus && (
          <div style={{ marginBottom: 'var(--space-2)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--usa-base-dark)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 2 }}>ATO Status</div>
            <span style={{ fontSize: 13, fontWeight: 700, color: ATO_COLORS[product.atoStatus] }}>{product.atoStatus.replace('_', ' ')}</span>
            {product.atoExpiry && <span style={{ fontSize: 12, color: 'var(--usa-base-dark)', marginLeft: 8 }}>exp. {new Date(product.atoExpiry).toLocaleDateString()}</span>}
          </div>
        )}
        <Field label="FedRAMP" value={product.fedrampLevel ? FEDRAMP_LABELS[product.fedrampLevel] : null} />
        <Field label="Data Classification" value={product.dataClassification} />
      </Section>

      {/* Platform children */}
      {(product.childProducts ?? []).length > 0 && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <h2 className="section-title" style={{ marginBottom: 'var(--space-2)' }}>
            Built on this platform ({product.childProducts!.length})
          </h2>
          <div className="table-wrap">
            <table className="usa-table">
              <thead><tr><th>Product</th><th>Type</th><th>Status</th><th>Vendor</th></tr></thead>
              <tbody>
                {product.childProducts!.map((child) => (
                  <tr key={child.id} onClick={() => navigate(`/status/products/${child.id}`)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 600 }}>{child.name}</td>
                    <td>{TYPE_LABELS[child.productType]}</td>
                    <td>{STATUS_LABELS[child.productStatus]}</td>
                    <td>{child.vendor || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Projects using this product */}
      {(product.statusProjects ?? []).length > 0 && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <h2 className="section-title" style={{ marginBottom: 'var(--space-2)' }}>
            Projects ({product.statusProjects!.length})
          </h2>
          <div className="table-wrap">
            <table className="usa-table">
              <thead><tr><th>Status</th><th>Project</th><th>Program</th></tr></thead>
              <tbody>
                {product.statusProjects!.map(({ statusProject: sp }) => (
                  <tr key={sp.id} onClick={() => navigate(`/status/projects/${sp.id}`)} style={{ cursor: 'pointer' }}>
                    <td><RagBadge status={sp.status as any} /></td>
                    <td style={{ fontWeight: 600 }}>{sp.name}</td>
                    <td>{sp.program?.name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
