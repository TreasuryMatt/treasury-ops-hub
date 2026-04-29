import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { requestsApi } from '../api/requests';
import { projectsApi } from '../api/projects';
import { adminApi } from '../api/admin';
import { useAuth } from '../context/AuthContext';
import { Icon } from '../components/Icon';

interface FormData {
  projectId: string;
  projectOther: string;
  resourceType: string;
  roleId: string;
  functionalAreaId: string;
  percentNeeded: string;
  startDate: string;
  endDate: string;
  notes: string;
}

export function ResourceRequestForm() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>();
  const projectId = watch('projectId');
  const isOther = projectId === '__other__';

  const { data: projectsData } = useQuery({
    queryKey: ['projects', { limit: '200', sortBy: 'name', sortDir: 'asc' }],
    queryFn: () => projectsApi.list({ limit: '200', sortBy: 'name', sortDir: 'asc' }),
  });
  const { data: roles } = useQuery({ queryKey: ['roles'], queryFn: () => adminApi.roles() });
  const { data: functionalAreas } = useQuery({ queryKey: ['functional-areas'], queryFn: () => adminApi.functionalAreas() });

  const mutation = useMutation({
    mutationFn: (data: any) => requestsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requests'] });
      navigate('/staffing/requests');
    },
  });

  const onSubmit = (data: FormData) => {
    const payload: any = {
      projectId: data.projectId && data.projectId !== '__other__' ? data.projectId : null,
      projectOther: isOther ? data.projectOther || null : null,
      resourceType: data.resourceType || null,
      roleId: data.roleId || null,
      functionalAreaId: data.functionalAreaId || null,
      percentNeeded: data.percentNeeded ? parseInt(data.percentNeeded) : null,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      notes: data.notes || null,
    };
    mutation.mutate(payload);
  };

  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="usa-page">
      <div className="usa-page-header">
        <button
          className="usa-button usa-button--unstyled"
          onClick={() => navigate('/staffing/requests')}
          style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <Icon name="arrow_back" size={16} /> Back to Resource Requests
        </button>
        <h1 className="usa-page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="pending_actions" color="var(--usa-primary)" size={24} />
          New Resource Request
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="resource-form">
        {/* Read-only requestor info */}
        <div className="form-grid" style={{ marginBottom: 8 }}>
          <div className="usa-form-group">
            <label className="usa-label">Requestor</label>
            <div className="usa-input" style={{ background: '#f0f0f0', cursor: 'default' }}>{user?.displayName}</div>
          </div>
          <div className="usa-form-group">
            <label className="usa-label">Date of Request</label>
            <div className="usa-input" style={{ background: '#f0f0f0', cursor: 'default' }}>{today}</div>
          </div>
        </div>

        <div className="form-grid">
          <div className="usa-form-group">
            <label className="usa-label" htmlFor="projectId">Project *</label>
            <select id="projectId" className="usa-select" {...register('projectId', { required: true })}>
              <option value="">Select a project</option>
              {projectsData?.data.filter(p => p.isActive).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
              <option value="__other__">Other (not listed)</option>
            </select>
            {errors.projectId && <span className="usa-error-message">Required</span>}
          </div>

          {isOther && (
            <div className="usa-form-group">
              <label className="usa-label" htmlFor="projectOther">Project Name *</label>
              <input
                id="projectOther"
                className="usa-input"
                placeholder="Enter project or initiative name"
                {...register('projectOther', { required: isOther })}
              />
              {errors.projectOther && <span className="usa-error-message">Required</span>}
            </div>
          )}

          <div className="usa-form-group">
            <label className="usa-label" htmlFor="resourceType">Resource Type</label>
            <select id="resourceType" className="usa-select" {...register('resourceType')}>
              <option value="">No preference</option>
              <option value="federal">Federal</option>
              <option value="contractor">Contractor</option>
            </select>
          </div>

          <div className="usa-form-group">
            <label className="usa-label" htmlFor="roleId">Role / Skill Needed</label>
            <select id="roleId" className="usa-select" {...register('roleId')}>
              <option value="">Select role</option>
              {roles?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>

          <div className="usa-form-group">
            <label className="usa-label" htmlFor="functionalAreaId">Functional Area</label>
            <select id="functionalAreaId" className="usa-select" {...register('functionalAreaId')}>
              <option value="">Select area</option>
              {functionalAreas?.map((fa) => <option key={fa.id} value={fa.id}>{fa.name}</option>)}
            </select>
          </div>

          <div className="usa-form-group">
            <label className="usa-label" htmlFor="percentNeeded">% Utilization Needed</label>
            <input
              id="percentNeeded"
              className="usa-input"
              type="number"
              min={1}
              max={100}
              placeholder="e.g. 50"
              {...register('percentNeeded')}
            />
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
          <label className="usa-label" htmlFor="notes">Notes / Justification</label>
          <textarea
            id="notes"
            className="usa-textarea"
            rows={5}
            placeholder="Describe the need, any specific skills or experience required, and context for this request."
            {...register('notes')}
          />
        </div>

        {mutation.isError && (
          <div className="usa-alert usa-alert--error" style={{ marginTop: 16 }}>
            Failed to submit request. Please try again.
          </div>
        )}

        <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
          <button className="usa-button usa-button--success" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Submitting...' : 'Submit Request'}
          </button>
          <button className="usa-button usa-button--outline" type="button" onClick={() => navigate('/staffing/requests')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
