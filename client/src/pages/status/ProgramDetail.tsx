import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { programsApi } from '../../api/programs';
import { useAuth } from '../../context/AuthContext';
import { Program, ProductType } from '../../types';
import { Icon } from '../../components/Icon';
import { RagBadge } from '../../components/RagBadge';

const TYPE_LABELS: Record<ProductType, string> = {
  PLATFORM: 'Platform', APPLICATION: 'Application', INTEGRATION: 'Integration',
  SERVICE: 'Service', MOBILE_APP: 'Mobile App',
};

export function ProgramDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = user?.role === 'editor' || user?.role === 'manager' || user?.role === 'admin';

  const { data: program, isLoading } = useQuery<Program>({
    queryKey: ['program', id],
    queryFn: () => programsApi.get(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return <div className="page-loading"><span className="usa-spinner" aria-label="Loading" /> Loading...</div>;
  }

  if (!program) {
    return <div className="usa-page"><p>Program not found.</p></div>;
  }

  return (
    <div className="usa-page">
      <div className="usa-page-header">
        <div>
          <button
            className="usa-button usa-button--unstyled"
            onClick={() => navigate('/status/programs')}
            style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <Icon name="arrow_back" size={16} /> Back to Programs
          </button>
          <h1 className="usa-page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="folder" color="var(--usa-primary)" size={24} />
            {program.name}
          </h1>
          {program.portfolio && (
            <p className="usa-page-subtitle">Portfolio: {program.portfolio.name}</p>
          )}
          {program.federalOwner && (
            <p className="usa-page-subtitle">Federal Program Owner: {program.federalOwner}</p>
          )}
          {program.description && !program.portfolio && (
            <p className="usa-page-subtitle">{program.description}</p>
          )}
        </div>
        {canEdit && (
          <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
            <button className="usa-button usa-button--outline" onClick={() => navigate(`/status/programs/${id}/edit`)}>
              <Icon name="edit" size={16} /> Edit
            </button>
          </div>
        )}
      </div>

      {program.description && program.portfolio && (
        <p style={{ marginBottom: 'var(--space-3)', color: 'var(--usa-base-dark)' }}>{program.description}</p>
      )}

      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="section-title">Products ({program.products?.length ?? 0})</h2>
        {canEdit && (
          <button className="usa-button usa-button--outline usa-button--sm" onClick={() => navigate('/status/products/new')}>
            + New Product
          </button>
        )}
      </div>

      {!program.products?.length ? (
        <div className="empty-state" style={{ marginBottom: 'var(--space-3)' }}>
          <div className="empty-state__icon"><Icon name="inventory_2" size={48} /></div>
          <h3>No products linked</h3>
          <p>Link products to this program via the Products catalog.</p>
        </div>
      ) : (
        <div className="table-wrap" style={{ marginBottom: 'var(--space-3)' }}>
          <table className="usa-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Type</th>
                <th>Projects</th>
                {canEdit && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {program.products.map(({ product }) => (
                <tr key={product.id} onClick={() => navigate(`/status/products/${product.id}`)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 600 }}>{product.name}</td>
                  <td>{TYPE_LABELS[product.productType as ProductType] ?? product.productType}</td>
                  <td>{product._count?.statusProjects ?? 0}</td>
                  {canEdit && (
                    <td>
                      <button
                        className="usa-button usa-button--unstyled"
                        onClick={(e) => { e.stopPropagation(); navigate(`/status/products/${product.id}/edit`); }}
                      >
                        Edit
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="section-header">
        <h2 className="section-title">Projects ({program.statusProjects?.length ?? 0})</h2>
      </div>

      {!program.statusProjects?.length ? (
        <div className="empty-state">
          <div className="empty-state__icon"><Icon name="folder_open" size={48} /></div>
          <h3>No projects yet</h3>
          <p>Add a project to this program to start tracking status.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="usa-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Project</th>
                <th>Phase</th>
                <th>Products</th>
                <th>Owner</th>
                <th>Next Update Due</th>
              </tr>
            </thead>
            <tbody>
              {program.statusProjects.map((sp: any) => (
                <tr key={sp.id} onClick={() => navigate(`/status/projects/${sp.id}`)} style={{ cursor: 'pointer' }}>
                  <td><RagBadge status={sp.status} /></td>
                  <td style={{ fontWeight: 600 }}>{sp.name}</td>
                  <td>{sp.phase?.name || '—'}</td>
                  <td>{(sp as any).products?.map((pp: any) => pp.product.name).join(', ') || '—'}</td>
                  <td>{sp.owner?.displayName || '—'}</td>
                  <td>
                    {sp.nextUpdateDue ? (
                      <span style={{ color: new Date(sp.nextUpdateDue) < new Date() ? 'var(--usa-error)' : undefined, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {new Date(sp.nextUpdateDue).toLocaleDateString()}
                        {new Date(sp.nextUpdateDue) < new Date() && <Icon name="warning" size={14} color="var(--usa-error)" />}
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(program.statusProjects?.length ?? 0) > 0 && (
        <div style={{ marginTop: 'var(--space-2)', display: 'flex', gap: 'var(--space-1)' }}>
          <button
            className="usa-button usa-button--outline usa-button--sm"
            onClick={() => navigate(`/status/roadmap?programId=${id}`)}
          >
            <Icon name="timeline" size={16} /> View Roadmap
          </button>
        </div>
      )}
    </div>
  );
}
