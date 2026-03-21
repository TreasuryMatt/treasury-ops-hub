import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { resourcesApi } from '../api/resources';
import { adminApi } from '../api/admin';
import { Icon } from '../components/Icon';

interface FormData {
  resourceType: string;
  firstName: string;
  lastName: string;
  division: string;
  functionalAreaId: string;
  opsEngLead: string;
  secondLineSupervisorId: string;
  supervisorId: string;
  gsLevel: string;
  isMatrixed: boolean;
  isSupervisor: boolean;
  popStartDate: string;
  popEndDate: string;
  primaryRoleId: string;
  secondaryRoleId: string;
  availableForWork: boolean;
  notes: string;
}

export function ResourceForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormData>();
  const resourceType = watch('resourceType');

  const { data: existing } = useQuery({
    queryKey: ['resource', id],
    queryFn: () => resourcesApi.get(id!),
    enabled: isEdit,
  });

  const { data: roles } = useQuery({ queryKey: ['roles'], queryFn: () => adminApi.roles() });
  const { data: functionalAreas } = useQuery({ queryKey: ['functional-areas'], queryFn: () => adminApi.functionalAreas() });
  const { data: supervisors } = useQuery({ queryKey: ['supervisors'], queryFn: () => resourcesApi.supervisors() });

  useEffect(() => {
    if (existing) {
      reset({
        resourceType: existing.resourceType,
        firstName: existing.firstName,
        lastName: existing.lastName,
        division: existing.division,
        functionalAreaId: existing.functionalAreaId || '',
        opsEngLead: existing.opsEngLead || '',
        secondLineSupervisorId: existing.secondLineSupervisorId || '',
        supervisorId: existing.supervisorId || '',
        gsLevel: existing.gsLevel || '',
        isMatrixed: existing.isMatrixed || false,
        isSupervisor: existing.isSupervisor || false,
        popStartDate: existing.popStartDate ? existing.popStartDate.split('T')[0] : '',
        popEndDate: existing.popEndDate ? existing.popEndDate.split('T')[0] : '',
        primaryRoleId: existing.primaryRoleId || '',
        secondaryRoleId: existing.secondaryRoleId || '',
        availableForWork: existing.availableForWork,
        notes: existing.notes || '',
      });
    }
  }, [existing, reset]);

  const mutation = useMutation({
    mutationFn: (data: any) => isEdit ? resourcesApi.update(id!, data) : resourcesApi.create(data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['resources'] });
      qc.invalidateQueries({ queryKey: ['supervisors'] });
      navigate(`/resources/${res.id}`);
    },
  });

  const onSubmit = (data: FormData) => {
    const payload: any = {
      ...data,
      functionalAreaId: data.functionalAreaId || null,
      primaryRoleId: data.primaryRoleId || null,
      secondaryRoleId: data.secondaryRoleId || null,
      supervisorId: data.supervisorId || null,
      secondLineSupervisorId: data.secondLineSupervisorId || null,
      gsLevel: data.resourceType === 'federal' ? data.gsLevel || null : null,
      isMatrixed: data.resourceType === 'federal' ? data.isMatrixed : null,
      popStartDate: data.resourceType === 'contractor' && data.popStartDate ? new Date(data.popStartDate) : null,
      popEndDate: data.resourceType === 'contractor' && data.popEndDate ? new Date(data.popEndDate) : null,
    };
    mutation.mutate(payload);
  };

  return (
    <div className="usa-page">
      <div className="usa-page-header">
        <button className="usa-button usa-button--unstyled" onClick={() => navigate(-1)} style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Icon name="arrow_back" size={16} /> Back
        </button>
        <h1 className="usa-page-title">{isEdit ? 'Edit Resource' : 'Add Resource'}</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="resource-form">
        <div className="form-grid">
          <div className="usa-form-group">
            <label className="usa-label" htmlFor="resourceType">Type *</label>
            <select id="resourceType" className="usa-select" {...register('resourceType', { required: true })} defaultValue="contractor">
              <option value="federal">Federal</option>
              <option value="contractor">Contractor</option>
            </select>
          </div>
          <div className="usa-form-group">
            <label className="usa-label" htmlFor="division">Division *</label>
            <select id="division" className="usa-select" {...register('division', { required: true })} defaultValue="operations">
              <option value="operations">Operations</option>
              <option value="engineering">Engineering</option>
              <option value="pmso">PMSO</option>
            </select>
          </div>
          <div className="usa-form-group">
            <label className="usa-label" htmlFor="firstName">First Name *</label>
            <input id="firstName" className="usa-input" {...register('firstName', { required: true })} />
            {errors.firstName && <span className="usa-error-message">Required</span>}
          </div>
          <div className="usa-form-group">
            <label className="usa-label" htmlFor="lastName">Last Name *</label>
            <input id="lastName" className="usa-input" {...register('lastName', { required: true })} />
            {errors.lastName && <span className="usa-error-message">Required</span>}
          </div>
          <div className="usa-form-group">
            <label className="usa-label" htmlFor="primaryRoleId">Primary Role</label>
            <select id="primaryRoleId" className="usa-select" {...register('primaryRoleId')}>
              <option value="">Select role</option>
              {roles?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="usa-form-group">
            <label className="usa-label" htmlFor="secondaryRoleId">Secondary Role</label>
            <select id="secondaryRoleId" className="usa-select" {...register('secondaryRoleId')}>
              <option value="">None</option>
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
            <label className="usa-label" htmlFor="supervisorId">Supervisor</label>
            <select id="supervisorId" className="usa-select" {...register('supervisorId')}>
              <option value="">None</option>
              {supervisors?.map((s) => (
                <option key={s.id} value={s.id}>{s.lastName}, {s.firstName}</option>
              ))}
            </select>
          </div>
          <div className="usa-form-group">
            <label className="usa-label" htmlFor="secondLineSupervisorId">2nd Line Supervisor</label>
            <select id="secondLineSupervisorId" className="usa-select" {...register('secondLineSupervisorId')}>
              <option value="">None</option>
              {supervisors?.map((s) => (
                <option key={s.id} value={s.id}>{s.lastName}, {s.firstName}</option>
              ))}
            </select>
          </div>
          <div className="usa-form-group">
            <label className="usa-label" htmlFor="opsEngLead">Ops/Engineering Lead</label>
            <input id="opsEngLead" className="usa-input" {...register('opsEngLead')} />
          </div>

          {resourceType === 'federal' && (
            <>
              <div className="usa-form-group">
                <label className="usa-label" htmlFor="gsLevel">GS Level</label>
                <input id="gsLevel" className="usa-input" {...register('gsLevel')} placeholder="e.g. 14" />
              </div>
              <div className="usa-form-group" style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 28 }}>
                <input id="isMatrixed" type="checkbox" className="usa-checkbox__input" {...register('isMatrixed')} />
                <label htmlFor="isMatrixed" className="usa-checkbox__label">Matrixed Resource</label>
              </div>
            </>
          )}

          {resourceType === 'contractor' && (
            <>
              <div className="usa-form-group">
                <label className="usa-label" htmlFor="popStartDate">POP Start Date</label>
                <input id="popStartDate" className="usa-input" type="date" {...register('popStartDate')} />
              </div>
              <div className="usa-form-group">
                <label className="usa-label" htmlFor="popEndDate">POP End Date</label>
                <input id="popEndDate" className="usa-input" type="date" {...register('popEndDate')} />
              </div>
            </>
          )}
        </div>

        <div style={{ marginTop: 16, display: 'flex', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input id="availableForWork" type="checkbox" className="usa-checkbox__input" {...register('availableForWork')} />
            <label htmlFor="availableForWork" className="usa-checkbox__label">Available for Work</label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input id="isSupervisor" type="checkbox" className="usa-checkbox__input" {...register('isSupervisor')} />
            <label htmlFor="isSupervisor" className="usa-checkbox__label">Is Supervisor</label>
          </div>
        </div>

        <div className="usa-form-group" style={{ marginTop: 16 }}>
          <label className="usa-label" htmlFor="notes">Notes</label>
          <textarea id="notes" className="usa-textarea" rows={4} {...register('notes')} />
        </div>

        {mutation.isError && (
          <div className="usa-alert usa-alert--error" style={{ marginTop: 16 }}>
            Failed to save resource. Please check your input.
          </div>
        )}

        <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
          <button className="usa-button" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : isEdit ? 'Update Resource' : 'Create Resource'}
          </button>
          <button className="usa-button usa-button--outline" type="button" onClick={() => navigate(-1)}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
