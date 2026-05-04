import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { portfoliosApi } from '../../api/portfolios';
import { Icon } from '../../components/Icon';

interface FormData {
  name: string;
  description: string;
  owner: string;
  budget: string;
}

export function PortfolioForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = !!id;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>();

  const { data: portfolio } = useQuery({
    queryKey: ['portfolio', id],
    queryFn: () => portfoliosApi.get(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (portfolio) {
      reset({
        name: portfolio.name,
        description: portfolio.description || '',
        owner: portfolio.owner || '',
        budget: portfolio.budget !== null && portfolio.budget !== undefined ? String(portfolio.budget) : '',
      });
    }
  }, [portfolio, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        name: data.name,
        description: data.description || null,
        owner: data.owner || null,
        budget: data.budget ? parseFloat(data.budget) : null,
      };
      return isEdit ? portfoliosApi.update(id!, payload) : portfoliosApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portfolios'] });
      navigate('/status/portfolios');
    },
  });

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
            <Icon name="work" color="var(--usa-primary)" size={24} />
            {isEdit ? 'Edit Portfolio' : 'New Portfolio'}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} style={{ maxWidth: 600 }}>
        <div className="usa-form-group">
          <label className="usa-label" htmlFor="name">Name *</label>
          <input
            className="usa-input"
            id="name"
            {...register('name', { required: 'Name is required' })}
          />
          {errors.name && <span className="usa-error-message">{errors.name.message}</span>}
        </div>

        <div className="usa-form-group">
          <label className="usa-label" htmlFor="description">Description</label>
          <textarea className="usa-textarea" id="description" {...register('description')} rows={3} />
        </div>

        <div className="usa-form-group">
          <label className="usa-label" htmlFor="owner">Portfolio Manager</label>
          <input
            className="usa-input"
            id="owner"
            placeholder="e.g. Jane Smith"
            {...register('owner')}
          />
        </div>

        <div className="usa-form-group">
          <label className="usa-label" htmlFor="budget">Budget (USD)</label>
          <input
            className="usa-input"
            id="budget"
            type="number"
            step="0.01"
            min="0"
            placeholder="e.g. 5000000"
            {...register('budget', {
              validate: (v) => !v || !isNaN(parseFloat(v)) || 'Must be a valid number',
            })}
          />
          {errors.budget && <span className="usa-error-message">{errors.budget.message}</span>}
        </div>

        {mutation.isError && (
          <div className="usa-alert usa-alert--error" style={{ marginBottom: 'var(--space-3)' }}>
            <div className="usa-alert__body">
              <p>{(mutation.error as any)?.response?.data?.error || 'Failed to save portfolio.'}</p>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 'var(--space-1)', marginTop: 'var(--space-3)' }}>
          <button type="submit" className="usa-button usa-button--success" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : isEdit ? 'Update Portfolio' : 'Create Portfolio'}
          </button>
          <button type="button" className="usa-button usa-button--outline" onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
