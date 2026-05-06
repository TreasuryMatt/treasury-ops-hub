import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/admin';
import { resourcesApi } from '../../api/resources';
import { Icon } from '../../components/Icon';

interface WizardForm {
  caiaId: string;
  displayName: string;
  email: string;
  role: string;
  userType: 'staff' | 'customer';
  isIntakeReviewer: boolean;
  isResourceManager: boolean;
  isResourceRequestor: boolean;
  resourceType: string;
  firstName: string;
  lastName: string;
  division: string;
  functionalAreaId: string;
  primaryRoleId: string;
  secondaryRoleId: string;
  supervisorId: string;
  secondLineSupervisorId: string;
  opsEngLead: string;
  gsLevel: string;
  isMatrixed: boolean;
  popStartDate: string;
  popEndDate: string;
  popAlertDaysBefore: string;
  isSupervisor: boolean;
  availableForWork: boolean;
  notes: string;
}

export function OnboardStaff() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { register, handleSubmit, watch, formState: { errors } } = useForm<WizardForm>({
    defaultValues: {
      role: 'viewer',
      userType: 'staff',
      resourceType: 'federal',
      division: 'operations',
      isIntakeReviewer: false,
      isResourceManager: false,
      isResourceRequestor: false,
      isSupervisor: false,
      availableForWork: true,
    },
  });

  const resourceType = watch('resourceType');

  const { data: roles } = useQuery({ queryKey: ['roles'], queryFn: () => adminApi.roles() });
  const { data: functionalAreas } = useQuery({ queryKey: ['functional-areas'], queryFn: () => adminApi.functionalAreas() });
  const { data: supervisors } = useQuery({ queryKey: ['supervisors'], queryFn: () => resourcesApi.supervisors() });

  const mutation = useMutation({
    mutationFn: (data: any) => adminApi.onboardStaff(data),
    onSuccess: (result: any) => {
      qc.invalidateQueries({ queryKey: ['resources'] });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      navigate(`/staffing/resources/${result.resource.id}`);
    },
  });

  const onSubmit = (data: WizardForm) => {
    mutation.mutate({
      user: {
        caiaId: data.caiaId,
        displayName: data.displayName,
        email: data.email,
        role: data.role,
        userType: data.userType,
        isIntakeReviewer: data.isIntakeReviewer,
        isResourceManager: data.isResourceManager,
        isResourceRequestor: data.isResourceRequestor,
      },
      resource: {
        resourceType: data.resourceType,
        firstName: data.firstName,
        lastName: data.lastName,
        division: data.division,
        functionalAreaId: data.functionalAreaId || null,
        primaryRoleId: data.primaryRoleId || null,
        secondaryRoleId: data.secondaryRoleId || null,
        supervisorId: data.supervisorId || null,
        secondLineSupervisorId: data.secondLineSupervisorId || null,
        opsEngLead: data.opsEngLead || null,
        gsLevel: data.resourceType === 'federal' ? data.gsLevel || null : null,
        isMatrixed: data.resourceType === 'federal' ? data.isMatrixed : null,
        popStartDate: data.resourceType === 'contractor' && data.popStartDate ? data.popStartDate : null,
        popEndDate: data.resourceType === 'contractor' && data.popEndDate ? data.popEndDate : null,
        popAlertDaysBefore: data.resourceType === 'contractor' && data.popAlertDaysBefore ? data.popAlertDaysBefore : null,
        isSupervisor: data.isSupervisor,
        availableForWork: data.availableForWork,
        notes: data.notes || null,
      },
    });
  };

  return (
    <div className="usa-page">
      <div className="usa-page-header">
        <h1 className="usa-page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="person_add" color="var(--usa-base-dark)" size={26} />
          Onboard Staff Member
        </h1>
        <p className="usa-page-subtitle">Creates a login account and staffing record linked together in one step.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>

          {/* ── Login Account ── */}
          <div className="detail-card">
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="manage_accounts" size={18} color="var(--usa-base-dark)" />
              Login Account
            </h2>

            <div className="usa-form-group">
              <label className="usa-label" htmlFor="caiaId">CAIA ID *</label>
              <input id="caiaId" className="usa-input" {...register('caiaId', { required: true })} />
              {errors.caiaId && <span className="usa-error-message">Required</span>}
            </div>
            <div className="usa-form-group">
              <label className="usa-label" htmlFor="displayName">Display Name *</label>
              <input id="displayName" className="usa-input" {...register('displayName', { required: true })} />
              {errors.displayName && <span className="usa-error-message">Required</span>}
            </div>
            <div className="usa-form-group">
              <label className="usa-label" htmlFor="email">Email *</label>
              <input id="email" className="usa-input" type="email" {...register('email', { required: true })} />
              {errors.email && <span className="usa-error-message">Required</span>}
            </div>
            <div className="usa-form-group">
              <label className="usa-label" htmlFor="role">Role</label>
              <select id="role" className="usa-select" {...register('role')}>
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="usa-form-group">
              <label className="usa-label" htmlFor="userType">User Type</label>
              <select id="userType" className="usa-select" {...register('userType')}>
                <option value="staff">Staff</option>
                <option value="customer">Customer</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input id="isIntakeReviewer" type="checkbox" className="usa-checkbox__input" {...register('isIntakeReviewer')} />
                <label htmlFor="isIntakeReviewer" className="usa-checkbox__label">Intake Reviewer</label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input id="isResourceManager" type="checkbox" className="usa-checkbox__input" {...register('isResourceManager')} />
                <label htmlFor="isResourceManager" className="usa-checkbox__label">Resource Manager</label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input id="isResourceRequestor" type="checkbox" className="usa-checkbox__input" {...register('isResourceRequestor')} />
                <label htmlFor="isResourceRequestor" className="usa-checkbox__label">Resource Requestor</label>
              </div>
            </div>
          </div>

          {/* ── Staffing Record ── */}
          <div className="detail-card">
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="people" size={18} color="var(--usa-primary)" />
              Staffing Record
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
              <div className="usa-form-group">
                <label className="usa-label" htmlFor="resourceType">Type *</label>
                <select id="resourceType" className="usa-select" {...register('resourceType', { required: true })}>
                  <option value="federal">Federal</option>
                  <option value="contractor">Contractor</option>
                </select>
              </div>
              <div className="usa-form-group">
                <label className="usa-label" htmlFor="division">Division *</label>
                <select id="division" className="usa-select" {...register('division', { required: true })}>
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
                  {supervisors?.map((s) => <option key={s.id} value={s.id}>{s.lastName}, {s.firstName}</option>)}
                </select>
              </div>
              <div className="usa-form-group">
                <label className="usa-label" htmlFor="secondLineSupervisorId">2nd Line Supervisor</label>
                <select id="secondLineSupervisorId" className="usa-select" {...register('secondLineSupervisorId')}>
                  <option value="">None</option>
                  {supervisors?.map((s) => <option key={s.id} value={s.id}>{s.lastName}, {s.firstName}</option>)}
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
                  <div className="usa-form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="usa-label" htmlFor="popAlertDaysBefore">Alert lead time (days)</label>
                    <input id="popAlertDaysBefore" className="usa-input" type="number" min={1} max={365} placeholder="30" {...register('popAlertDaysBefore')} />
                    <span className="usa-hint">Days before POP end to send expiry notification. Default is 30.</span>
                  </div>
                </>
              )}
            </div>

            <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input id="isSupervisor" type="checkbox" className="usa-checkbox__input" {...register('isSupervisor')} />
                <label htmlFor="isSupervisor" className="usa-checkbox__label">Is Supervisor</label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input id="availableForWork" type="checkbox" className="usa-checkbox__input" {...register('availableForWork')} />
                <label htmlFor="availableForWork" className="usa-checkbox__label">Available for Work</label>
              </div>
            </div>

            <div className="usa-form-group" style={{ marginTop: 12 }}>
              <label className="usa-label" htmlFor="notes">Notes</label>
              <textarea id="notes" className="usa-textarea" rows={3} {...register('notes')} />
            </div>
          </div>
        </div>

        {mutation.isError && (
          <div className="usa-alert usa-alert--error" style={{ marginTop: 16 }}>
            {(mutation.error as any)?.response?.data?.error || 'Failed to create staff member. Please check your input.'}
          </div>
        )}

        <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
          <button className="usa-button usa-button--success" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating…' : 'Create Staff Member'}
          </button>
          <button className="usa-button usa-button--outline" type="button" onClick={() => navigate('/admin/users')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
