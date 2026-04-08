import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { programsApi } from '../../api/programs';
import { portfoliosApi } from '../../api/portfolios';
import { Portfolio } from '../../types';
import { Icon } from '../../components/Icon';

interface FormData {
  name: string;
  description: string;
  portfolioId: string;
}

export function ProgramForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = !!id;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>();

  const { data: program } = useQuery({
    queryKey: ['program', id],
    queryFn: () => programsApi.get(id!),
    enabled: isEdit,
  });

  const { data: portfolios = [] } = useQuery<Portfolio[]>({
    queryKey: ['portfolios'],
    queryFn: portfoliosApi.list,
  });

  useEffect(() => {
    if (program) {
      reset({
        name: program.name,
        description: program.description || '',
        portfolioId: program.portfolioId || '',
      });
    }
  }, [program, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = { ...data, portfolioId: data.portfolioId || null };
      return isEdit ? programsApi.update(id!, payload) : programsApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['programs'] });
      navigate('/status/programs');
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
          <h1 className="usa-page-title">{isEdit ? 'Edit Program' : 'New Program'}</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} style={{ maxWidth: 600 }}>
        <div className="usa-form-group">
          <label className="usa-label" htmlFor="name">Name *</label>
          <input className="usa-input" id="name" {...register('name', { required: 'Name is required' })} />
          {errors.name && <span className="usa-error-message">{errors.name.message}</span>}
        </div>

        <div className="usa-form-group">
          <label className="usa-label" htmlFor="description">Description</label>
          <textarea className="usa-textarea" id="description" {...register('description')} rows={3} />
        </div>

        <div className="usa-form-group">
          <label className="usa-label" htmlFor="portfolioId">Portfolio (optional)</label>
          <select className="usa-select" id="portfolioId" {...register('portfolioId')}>
            <option value="">— None —</option>
            {portfolios.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {mutation.isError && (
          <div className="usa-alert usa-alert--error" style={{ marginBottom: 'var(--space-3)' }}>
            <div className="usa-alert__body">
              <p>{(mutation.error as any)?.response?.data?.error || 'Failed to save program.'}</p>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 'var(--space-1)', marginTop: 'var(--space-3)' }}>
          <button type="submit" className="usa-button usa-button--success" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : isEdit ? 'Update Program' : 'Create Program'}
          </button>
          <button type="button" className="usa-button usa-button--outline" onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
