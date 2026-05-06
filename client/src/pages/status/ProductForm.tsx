import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '../../api/products';
import { programsApi } from '../../api/programs';
import { resourcesApi } from '../../api/resources';
import { Program, Product, Resource } from '../../types';
import { Icon } from '../../components/Icon';

interface FormData {
  name: string;
  description: string;
  productType: string;
  vendor: string;
  isInternal: boolean;
  productStatus: string;
  criticality: string;
  hostingModel: string;
  platformId: string;
  productOwner: string;
  technicalOwner: string;
  primaryUrl: string;
  documentationUrl: string;
  logoUrl: string;
  userCount: string;
  annualCost: string;
  contractExpiry: string;
  version: string;
  atoStatus: string;
  atoExpiry: string;
  fedrampLevel: string;
  dataClassification: string;
}

export function ProductForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = !!id;

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      productType: 'APPLICATION',
      productStatus: 'ACTIVE',
      criticality: 'MEDIUM',
      isInternal: false,
    },
  });

  const [selectedProgramIds, setSelectedProgramIds] = React.useState<string[]>([]);

  const { data: product } = useQuery<Product>({
    queryKey: ['product', id],
    queryFn: () => productsApi.get(id!),
    enabled: isEdit,
  });

  const { data: programs = [] } = useQuery<Program[]>({
    queryKey: ['programs'],
    queryFn: programsApi.list,
  });

  const { data: allProducts = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => productsApi.list(),
  });
  const { data: resourcesPage } = useQuery({
    queryKey: ['resources-list-all'],
    queryFn: () => resourcesApi.list({ limit: '1000', isActive: 'true' }),
  });
  const resources: Resource[] = resourcesPage?.data ?? [];

  const platformOptions = allProducts.filter(
    (p) => p.id !== id && p.productType === 'PLATFORM',
  );

  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        description: product.description || '',
        productType: product.productType,
        vendor: product.vendor || '',
        isInternal: product.isInternal,
        productStatus: product.productStatus,
        criticality: product.criticality,
        hostingModel: product.hostingModel || '',
        platformId: product.platformId || '',
        productOwner: product.productOwner || '',
        technicalOwner: product.technicalOwner || '',
        primaryUrl: product.primaryUrl || '',
        documentationUrl: product.documentationUrl || '',
        logoUrl: product.logoUrl || '',
        userCount: product.userCount?.toString() || '',
        annualCost: product.annualCost?.toString() || '',
        contractExpiry: product.contractExpiry ? product.contractExpiry.split('T')[0] : '',
        version: product.version || '',
        atoStatus: product.atoStatus || '',
        atoExpiry: product.atoExpiry ? product.atoExpiry.split('T')[0] : '',
        fedrampLevel: product.fedrampLevel || '',
        dataClassification: product.dataClassification || '',
      });
      setSelectedProgramIds((product.programs ?? []).map((pp) => pp.program.id));
    }
  }, [product, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        ...data,
        description: data.description || null,
        vendor: data.vendor || null,
        hostingModel: data.hostingModel || null,
        platformId: data.platformId || null,
        productOwner: data.productOwner || null,
        technicalOwner: data.technicalOwner || null,
        primaryUrl: data.primaryUrl || null,
        documentationUrl: data.documentationUrl || null,
        logoUrl: data.logoUrl || null,
        userCount: data.userCount ? Number(data.userCount) : null,
        annualCost: data.annualCost || null,
        contractExpiry: data.contractExpiry || null,
        version: data.version || null,
        atoStatus: data.atoStatus || null,
        atoExpiry: data.atoExpiry || null,
        fedrampLevel: data.fedrampLevel || null,
        dataClassification: data.dataClassification || null,
        programIds: selectedProgramIds,
      };
      return isEdit ? productsApi.update(id!, payload) : productsApi.create(payload);
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['programs'] });
      navigate(`/status/products/${result.id}`);
    },
  });

  const toggleProgram = (pid: string) => {
    setSelectedProgramIds((prev) =>
      prev.includes(pid) ? prev.filter((id) => id !== pid) : [...prev, pid],
    );
  };

  return (
    <div className="usa-page">
      <div className="usa-page-header">
        <div>
          <button
            className="usa-button usa-button--unstyled"
            onClick={() => navigate(-1)}
            style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <Icon name="arrow_back" size={16} /> Back
          </button>
          <h1 className="usa-page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="inventory_2" color="var(--usa-primary)" size={24} />
            {isEdit ? 'Edit Product' : 'New Product'}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} style={{ maxWidth: 860 }}>

        {/* ── Core identity ── */}
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 'var(--space-2)', borderBottom: '1px solid var(--usa-base-lighter)', paddingBottom: 6 }}>Identity</h2>
        <div className="form-grid">
          <div className="usa-form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="usa-label" htmlFor="name">Product Name *</label>
            <input className="usa-input" id="name" {...register('name', { required: 'Name is required' })} />
            {errors.name && <span className="usa-error-message">{errors.name.message}</span>}
          </div>

          <div className="usa-form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="usa-label" htmlFor="description">Description</label>
            <textarea className="usa-textarea" id="description" rows={3} {...register('description')} />
          </div>

          <div className="usa-form-group">
            <label className="usa-label" htmlFor="productType">Type *</label>
            <select className="usa-select" id="productType" {...register('productType', { required: true })}>
              <option value="APPLICATION">Application</option>
              <option value="PLATFORM">Platform</option>
              <option value="INTEGRATION">Integration</option>
              <option value="SERVICE">Service</option>
              <option value="MOBILE_APP">Mobile App</option>
            </select>
          </div>

          <div className="usa-form-group">
            <label className="usa-label" htmlFor="productStatus">Status</label>
            <select className="usa-select" id="productStatus" {...register('productStatus')}>
              <option value="ACTIVE">Active</option>
              <option value="EVALUATING">Evaluating</option>
              <option value="PLANNED">Planned</option>
              <option value="DEPRECATED">Deprecated</option>
              <option value="SUNSET">Sunset</option>
            </select>
          </div>

          <div className="usa-form-group">
            <label className="usa-label" htmlFor="vendor">Vendor / Maker</label>
            <input className="usa-input" id="vendor" placeholder="e.g. Salesforce Inc. or Internal" {...register('vendor')} />
          </div>

          <div className="usa-form-group">
            <label className="usa-label" htmlFor="version">Version</label>
            <input className="usa-input" id="version" placeholder="e.g. Spring '26, v2.4.1" {...register('version')} />
          </div>

          <div className="usa-form-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" id="isInternal" {...register('isInternal')} style={{ width: 18, height: 18 }} />
            <label htmlFor="isInternal" style={{ marginBottom: 0, fontWeight: 700 }}>Built internally</label>
          </div>

          {platformOptions.length > 0 && (
            <div className="usa-form-group">
              <label className="usa-label" htmlFor="platformId">Runs on Platform</label>
              <select className="usa-select" id="platformId" {...register('platformId')}>
                <option value="">— None —</option>
                {platformOptions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* ── Hosting & Infra ── */}
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 'var(--space-3) 0 var(--space-2)', borderBottom: '1px solid var(--usa-base-lighter)', paddingBottom: 6 }}>Infrastructure</h2>
        <div className="form-grid">
          <div className="usa-form-group">
            <label className="usa-label" htmlFor="hostingModel">Hosting Model</label>
            <select className="usa-select" id="hostingModel" {...register('hostingModel')}>
              <option value="">— None —</option>
              <option value="SAAS">SaaS</option>
              <option value="ON_PREM">On-Premises</option>
              <option value="HYBRID">Hybrid</option>
              <option value="GOVT_CLOUD">Government Cloud</option>
              <option value="INTERNAL_HOSTED">Internal Hosted</option>
            </select>
          </div>

          <div className="usa-form-group">
            <label className="usa-label" htmlFor="primaryUrl">Product URL</label>
            <input className="usa-input" id="primaryUrl" type="url" placeholder="https://…" {...register('primaryUrl')} />
          </div>

          <div className="usa-form-group">
            <label className="usa-label" htmlFor="documentationUrl">Documentation URL</label>
            <input className="usa-input" id="documentationUrl" type="url" placeholder="https://…" {...register('documentationUrl')} />
          </div>

          <div className="usa-form-group">
            <label className="usa-label" htmlFor="logoUrl">Logo URL</label>
            <input className="usa-input" id="logoUrl" type="url" placeholder="https://…" {...register('logoUrl')} />
          </div>
        </div>

        {/* ── Ownership ── */}
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 'var(--space-3) 0 var(--space-2)', borderBottom: '1px solid var(--usa-base-lighter)', paddingBottom: 6 }}>Ownership</h2>
        <div className="form-grid">
          <div className="usa-form-group">
            <label className="usa-label" htmlFor="productOwner">Federal Product Owner</label>
            <select className="usa-select" id="productOwner" {...register('productOwner')}>
              <option value="">— Select —</option>
              {resources.map((r) => (
                <option key={r.id} value={`${r.firstName} ${r.lastName}`}>{r.firstName} {r.lastName}</option>
              ))}
            </select>
          </div>

          <div className="usa-form-group">
            <label className="usa-label" htmlFor="technicalOwner">Technical Owner</label>
            <input className="usa-input" id="technicalOwner" placeholder="Name or office" {...register('technicalOwner')} />
          </div>

          <div className="usa-form-group">
            <label className="usa-label" htmlFor="criticality">Criticality</label>
            <select className="usa-select" id="criticality" {...register('criticality')}>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="MISSION_CRITICAL">Mission Critical</option>
            </select>
          </div>

          <div className="usa-form-group">
            <label className="usa-label" htmlFor="userCount">Approximate Users</label>
            <input className="usa-input" id="userCount" type="number" min="0" {...register('userCount')} />
          </div>
        </div>

        {/* ── Contract ── */}
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 'var(--space-3) 0 var(--space-2)', borderBottom: '1px solid var(--usa-base-lighter)', paddingBottom: 6 }}>Contract & Cost</h2>
        <div className="form-grid">
          <div className="usa-form-group">
            <label className="usa-label" htmlFor="annualCost">Annual Cost ($)</label>
            <input className="usa-input" id="annualCost" type="number" min="0" step="0.01" {...register('annualCost')} />
          </div>

          <div className="usa-form-group">
            <label className="usa-label" htmlFor="contractExpiry">Contract Expiry</label>
            <input className="usa-input" id="contractExpiry" type="date" {...register('contractExpiry')} />
          </div>
        </div>

        {/* ── Compliance ── */}
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 'var(--space-3) 0 var(--space-2)', borderBottom: '1px solid var(--usa-base-lighter)', paddingBottom: 6 }}>Compliance</h2>
        <div className="form-grid">
          <div className="usa-form-group">
            <label className="usa-label" htmlFor="atoStatus">ATO Status</label>
            <select className="usa-select" id="atoStatus" {...register('atoStatus')}>
              <option value="">— None —</option>
              <option value="AUTHORIZED">Authorized</option>
              <option value="PENDING">Pending</option>
              <option value="EXPIRED">Expired</option>
              <option value="NOT_REQUIRED">Not Required</option>
            </select>
          </div>

          <div className="usa-form-group">
            <label className="usa-label" htmlFor="atoExpiry">ATO Expiry</label>
            <input className="usa-input" id="atoExpiry" type="date" {...register('atoExpiry')} />
          </div>

          <div className="usa-form-group">
            <label className="usa-label" htmlFor="fedrampLevel">FedRAMP Level</label>
            <select className="usa-select" id="fedrampLevel" {...register('fedrampLevel')}>
              <option value="">— None —</option>
              <option value="LOW">Low</option>
              <option value="MODERATE">Moderate</option>
              <option value="HIGH">High</option>
              <option value="NOT_APPLICABLE">Not Applicable</option>
            </select>
          </div>

          <div className="usa-form-group">
            <label className="usa-label" htmlFor="dataClassification">Data Classification</label>
            <select className="usa-select" id="dataClassification" {...register('dataClassification')}>
              <option value="">— None —</option>
              <option value="PUBLIC">Public</option>
              <option value="SENSITIVE">Sensitive</option>
              <option value="RESTRICTED">Restricted</option>
            </select>
          </div>
        </div>

        {/* ── Program associations ── */}
        {programs.length > 0 && (
          <>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 'var(--space-3) 0 var(--space-2)', borderBottom: '1px solid var(--usa-base-lighter)', paddingBottom: 6 }}>Associated Programs</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 'var(--space-3)' }}>
              {programs.map((p) => {
                const selected = selectedProgramIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleProgram(p.id)}
                    style={{
                      padding: '4px 12px', borderRadius: 20, border: `2px solid ${selected ? 'var(--usa-primary)' : 'var(--usa-base-lighter)'}`,
                      background: selected ? 'var(--usa-primary-lighter)' : '#fff',
                      color: selected ? 'var(--usa-primary-dark)' : 'var(--usa-base-dark)',
                      fontWeight: selected ? 700 : 400, cursor: 'pointer', fontSize: 13,
                    }}
                  >
                    {selected && <Icon name="check" size={13} />}{' '}{p.name}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {mutation.isError && (
          <div className="usa-alert usa-alert--error" style={{ marginBottom: 'var(--space-3)' }}>
            <div className="usa-alert__body">
              <p>{(mutation.error as any)?.response?.data?.error || 'Failed to save product.'}</p>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 'var(--space-1)', marginTop: 'var(--space-3)' }}>
          <button type="submit" className="usa-button usa-button--success" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : isEdit ? 'Update Product' : 'Create Product'}
          </button>
          <button type="button" className="usa-button usa-button--outline" onClick={() => navigate(-1)}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
