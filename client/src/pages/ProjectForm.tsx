import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { projectsApi } from '../api/projects';
import { adminApi } from '../api/admin';
import { Icon } from '../components/Icon';

interface FormData {
  name: string;
  productId: string;
  federalProductOwner: string;
  customerContact: string;
  priority: string;
  status: string;
  startDate: string;
  endDate: string;
  description: string;
}

export function ProjectForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { register, handleSubmit, reset } = useForm<FormData>();

  const { data: existing } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(id!),
    enabled: isEdit,
  });

  const { data: products } = useQuery({ queryKey: ['products'], queryFn: () => adminApi.products() });

  useEffect(() => {
    if (existing) {
      reset({
        name: existing.name,
        productId: existing.productId || '',
        federalProductOwner: existing.federalProductOwner || '',
        customerContact: existing.customerContact || '',
        priority: existing.priority || '',
        status: existing.status,
        startDate: existing.startDate ? existing.startDate.split('T')[0] : '',
        endDate: existing.endDate ? existing.endDate.split('T')[0] : '',
        description: existing.description || '',
      });
    }
  }, [existing, reset]);

  const mutation = useMutation({
    mutationFn: (data: any) => isEdit ? projectsApi.update(id!, data) : projectsApi.create(data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      navigate(`/projects/${res.id}`);
    },
  });

  const onSubmit = (data: FormData) => {
    const payload: any = {
      name: data.name,
      productId: data.productId || null,
      federalProductOwner: data.federalProductOwner || null,
      customerContact: data.customerContact || null,
      priority: data.priority || null,
      status: data.status,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      description: data.description || null,
    };
    mutation.mutate(payload);
  };

  return (
    <div className="usa-page">
      <div className="usa-page-header">
        <button className="usa-button usa-button--unstyled" onClick={() => navigate(-1)} style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Icon name="arrow_back" size={16} /> Back
        </button>
        <h1 className="usa-page-title">{isEdit ? 'Edit Project' : 'Add Project'}</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="form-grid">
          <div className="usa-form-group">
            <label className="usa-label" htmlFor="name">Project Name *</label>
            <input id="name" className="usa-input" {...register('name', { required: true })} />
          </div>
          <div className="usa-form-group">
            <label className="usa-label" htmlFor="productId">Application</label>
            <select id="productId" className="usa-select" {...register('productId')}>
              <option value="">Select application</option>
              {products?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="usa-form-group">
            <label className="usa-label" htmlFor="federalProductOwner">Federal Product Owner</label>
            <input id="federalProductOwner" className="usa-input" {...register('federalProductOwner')} />
          </div>
          <div className="usa-form-group">
            <label className="usa-label" htmlFor="customerContact">Customer Contact</label>
            <input id="customerContact" className="usa-input" {...register('customerContact')} />
          </div>
          <div className="usa-form-group">
            <label className="usa-label" htmlFor="status">Status *</label>
            <select id="status" className="usa-select" {...register('status', { required: true })} defaultValue="in_progress">
              <option value="in_progress">In Progress</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="usa-form-group">
            <label className="usa-label" htmlFor="priority">Priority</label>
            <select id="priority" className="usa-select" {...register('priority')}>
              <option value="">None</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div className="usa-form-group">
            <label className="usa-label" htmlFor="startDate">Start Date</label>
            <input id="startDate" className="usa-input" type="date" {...register('startDate')} />
          </div>
          <div className="usa-form-group">
            <label className="usa-label" htmlFor="endDate">End Date</label>
            <input id="endDate" className="usa-input" type="date" {...register('endDate')} />
          </div>
        </div>

        <div className="usa-form-group" style={{ marginTop: 16 }}>
          <label className="usa-label" htmlFor="description">Description</label>
          <textarea id="description" className="usa-textarea" rows={4} {...register('description')} />
        </div>

        {mutation.isError && (
          <div className="usa-alert usa-alert--error" style={{ marginTop: 16 }}>
            Failed to save project. Please check your input.
          </div>
        )}

        <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
          <button className="usa-button usa-button--success" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : isEdit ? 'Update Project' : 'Create Project'}
          </button>
          <button className="usa-button usa-button--outline" type="button" onClick={() => navigate(-1)}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
