import React, { useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { applicationsApi } from '../../api/applications';
import { programsApi } from '../../api/programs';
import { Program } from '../../types';
import { Icon } from '../../components/Icon';

interface FormData {
  name: string;
  description: string;
  programId: string;
}

export function ApplicationForm() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = !!id;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      programId: searchParams.get('programId') || '',
    },
  });

  const { data: application } = useQuery({
    queryKey: ['application', id],
    queryFn: () => applicationsApi.get(id!),
    enabled: isEdit,
  });

  const { data: programs = [] } = useQuery<Program[]>({
    queryKey: ['programs'],
    queryFn: programsApi.list,
  });

  useEffect(() => {
    if (application) {
      reset({
        name: application.name,
        description: application.description || '',
        programId: application.programId,
      });
    }
  }, [application, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = { ...data, description: data.description || null };
      return isEdit ? applicationsApi.update(id!, payload) : applicationsApi.create(payload);
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['applications'] });
      qc.invalidateQueries({ queryKey: ['programs'] });
      qc.invalidateQueries({ queryKey: ['program', result.programId] });
      navigate(`/status/programs/${result.programId}`);
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
            <Icon name="tune" color="var(--usa-primary)" size={24} />
            {isEdit ? 'Edit Application' : 'New Application'}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} style={{ maxWidth: 600 }}>
        <div className="usa-form-group">
          <label className="usa-label" htmlFor="programId">Program *</label>
          <select className="usa-select" id="programId" {...register('programId', { required: 'Program is required' })}>
            <option value="">— Select —</option>
            {programs.map((program) => (
              <option key={program.id} value={program.id}>{program.name}</option>
            ))}
          </select>
          {errors.programId && <span className="usa-error-message">{errors.programId.message}</span>}
        </div>

        <div className="usa-form-group">
          <label className="usa-label" htmlFor="name">Name *</label>
          <input className="usa-input" id="name" {...register('name', { required: 'Name is required' })} />
          {errors.name && <span className="usa-error-message">{errors.name.message}</span>}
        </div>

        <div className="usa-form-group">
          <label className="usa-label" htmlFor="description">Description</label>
          <textarea className="usa-textarea" id="description" rows={3} {...register('description')} />
        </div>

        {mutation.isError && (
          <div className="usa-alert usa-alert--error" style={{ marginBottom: 'var(--space-3)' }}>
            <div className="usa-alert__body">
              <p>{(mutation.error as any)?.response?.data?.error || 'Failed to save application.'}</p>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 'var(--space-1)', marginTop: 'var(--space-3)' }}>
          <button type="submit" className="usa-button usa-button--success" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : isEdit ? 'Update Application' : 'Create Application'}
          </button>
          <button type="button" className="usa-button usa-button--outline" onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
