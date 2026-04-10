import React, { useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { statusProjectsApi } from '../../api/statusProjects';
import { projectsApi } from '../../api/projects';
import { programsApi } from '../../api/programs';
import { statusAdminApi } from '../../api/statusAdmin';
import { adminApi } from '../../api/admin';
import { Program, Department, StatusPriority, ExecutionType, CustomerCategory, Product, Project } from '../../types';
import { Icon } from '../../components/Icon';

interface FormData {
  name: string;
  description: string;
  programId: string;
  staffingProjectId: string;
  federalProductOwner: string;
  customerContact: string;
  departmentId: string;
  priorityId: string;
  executionTypeId: string;
  customerCategoryId: string;
  phase: string;
  status: string;
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate: string;
  actualEndDate: string;
  funded: boolean;
  updateCadence: string;
  productIds: string[];
}

export function StatusProjectForm() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = !!id;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      programId: searchParams.get('programId') || '',
      status: 'gray',
      updateCadence: 'monthly',
      funded: false,
      productIds: [],
    },
  });

  const { data: project } = useQuery({
    queryKey: ['status-project', id],
    queryFn: () => statusProjectsApi.get(id!),
    enabled: isEdit,
  });

  const { data: programs = [] } = useQuery<Program[]>({ queryKey: ['programs'], queryFn: programsApi.list });
  const { data: departments = [] } = useQuery<Department[]>({ queryKey: ['departments'], queryFn: statusAdminApi.departments });
  const { data: priorities = [] } = useQuery<StatusPriority[]>({ queryKey: ['status-priorities'], queryFn: statusAdminApi.priorities });
  const { data: executionTypes = [] } = useQuery<ExecutionType[]>({ queryKey: ['execution-types'], queryFn: statusAdminApi.executionTypes });
  const { data: customerCategories = [] } = useQuery<CustomerCategory[]>({ queryKey: ['customer-categories'], queryFn: statusAdminApi.customerCategories });
  const { data: products = [] } = useQuery<Product[]>({ queryKey: ['products'], queryFn: adminApi.products });
  const { data: staffingProjects = [] } = useQuery<Project[]>({
    queryKey: ['staffing-projects'],
    queryFn: () => projectsApi.list().then((r) => r.data),
  });

  useEffect(() => {
    if (project) {
      reset({
        name: project.name,
        description: project.description || '',
        programId: project.programId,
        staffingProjectId: project.staffingProjectId || '',
        federalProductOwner: project.federalProductOwner || '',
        customerContact: project.customerContact || '',
        departmentId: project.departmentId || '',
        priorityId: project.priorityId || '',
        executionTypeId: project.executionTypeId || '',
        customerCategoryId: project.customerCategoryId || '',
        phase: project.phase || '',
        status: project.status,
        plannedStartDate: project.plannedStartDate?.split('T')[0] || '',
        plannedEndDate: project.plannedEndDate?.split('T')[0] || '',
        actualStartDate: project.actualStartDate?.split('T')[0] || '',
        actualEndDate: project.actualEndDate?.split('T')[0] || '',
        funded: project.funded,
        updateCadence: project.updateCadence,
        productIds: project.products?.map((p) => p.productId) || [],
      });
    }
  }, [project, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        ...data,
        staffingProjectId: data.staffingProjectId || null,
        federalProductOwner: data.federalProductOwner || null,
        customerContact: data.customerContact || null,
        departmentId: data.departmentId || null,
        priorityId: data.priorityId || null,
        executionTypeId: data.executionTypeId || null,
        customerCategoryId: data.customerCategoryId || null,
        plannedStartDate: data.plannedStartDate || null,
        plannedEndDate: data.plannedEndDate || null,
        actualStartDate: data.actualStartDate || null,
        actualEndDate: data.actualEndDate || null,
      };
      return isEdit ? statusProjectsApi.update(id!, payload) : statusProjectsApi.create(payload);
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['status-projects'] });
      navigate(`/status/projects/${isEdit ? id : result.id}`);
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
          <h1 className="usa-page-title">{isEdit ? 'Edit Project' : 'New Status Project'}</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} style={{ maxWidth: 800 }}>
        <div className="form-grid">
          <div className="usa-form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="usa-label" htmlFor="name">Project Name *</label>
            <input className="usa-input" id="name" {...register('name', { required: 'Name is required' })} />
            {errors.name && <span className="usa-error-message">{errors.name.message}</span>}
          </div>

          <div className="usa-form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="usa-label" htmlFor="description">Description</label>
            <textarea className="usa-textarea" id="description" {...register('description')} rows={3} />
          </div>

          <div className="usa-form-group">
            <label className="usa-label" htmlFor="programId">Program *</label>
            <select className="usa-select" id="programId" {...register('programId', { required: 'Program is required' })}>
              <option value="">— Select —</option>
              {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {errors.programId && <span className="usa-error-message">{errors.programId.message}</span>}
          </div>

          <div className="usa-form-group">
            <label className="usa-label" htmlFor="status">Status</label>
            <select className="usa-select" id="status" {...register('status')}>
              <option value="gray">Not Started</option>
              <option value="green">Green — On Track</option>
              <option value="yellow">Yellow — At Risk</option>
              <option value="red">Red — Off Track</option>
            </select>
          </div>

          <div className="usa-form-group">
            <label className="usa-label" htmlFor="staffingProjectId">Linked Staffing Project</label>
            <select className="usa-select" id="staffingProjectId" {...register('staffingProjectId')}>
              <option value="">— None —</option>
              {staffingProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="usa-form-group">
            <label className="usa-label" htmlFor="federalProductOwner">Federal Product Owner</label>
            <input className="usa-input" id="federalProductOwner" {...register('federalProductOwner')} />
          </div>

          <div className="usa-form-group">
            <label className="usa-label" htmlFor="customerContact">Customer Contact</label>
            <input className="usa-input" id="customerContact" {...register('customerContact')} />
          </div>

          <div className="usa-form-group">
            <label className="usa-label" htmlFor="departmentId">Department</label>
            <select className="usa-select" id="departmentId" {...register('departmentId')}>
              <option value="">— None —</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <div className="usa-form-group">
            <label className="usa-label" htmlFor="priorityId">Priority</label>
            <select className="usa-select" id="priorityId" {...register('priorityId')}>
              <option value="">— None —</option>
              {priorities.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="usa-form-group">
            <label className="usa-label" htmlFor="executionTypeId">Execution Type</label>
            <select className="usa-select" id="executionTypeId" {...register('executionTypeId')}>
              <option value="">— None —</option>
              {executionTypes.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>

          <div className="usa-form-group">
            <label className="usa-label" htmlFor="customerCategoryId">Customer Category</label>
            <select className="usa-select" id="customerCategoryId" {...register('customerCategoryId')}>
              <option value="">— None —</option>
              {customerCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="usa-form-group">
            <label className="usa-label" htmlFor="phase">Phase</label>
            <input className="usa-input" id="phase" {...register('phase')} placeholder="e.g., Initiating, Planning, Executing" />
          </div>

          <div className="usa-form-group">
            <label className="usa-label" htmlFor="updateCadence">Update Cadence</label>
            <select className="usa-select" id="updateCadence" {...register('updateCadence')}>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Biweekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div className="usa-form-group">
            <label className="usa-label" htmlFor="plannedStartDate">Planned Start Date</label>
            <input className="usa-input" type="date" id="plannedStartDate" {...register('plannedStartDate')} />
          </div>

          <div className="usa-form-group">
            <label className="usa-label" htmlFor="plannedEndDate">Planned End Date</label>
            <input className="usa-input" type="date" id="plannedEndDate" {...register('plannedEndDate')} />
          </div>

          <div className="usa-form-group">
            <label className="usa-label" htmlFor="actualStartDate">Actual Start Date</label>
            <input className="usa-input" type="date" id="actualStartDate" {...register('actualStartDate')} />
          </div>

          <div className="usa-form-group">
            <label className="usa-label" htmlFor="actualEndDate">Actual End Date</label>
            <input className="usa-input" type="date" id="actualEndDate" {...register('actualEndDate')} />
          </div>

          <div className="usa-form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" id="funded" {...register('funded')} style={{ width: 18, height: 18 }} />
            <label htmlFor="funded" style={{ marginBottom: 0, fontWeight: 700 }}>Funded</label>
          </div>
        </div>

        <div className="usa-form-group" style={{ marginTop: 'var(--space-3)' }}>
          <label className="usa-label">Applications</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxHeight: 200, overflowY: 'auto', padding: 12, border: '2px solid var(--usa-base)', borderRadius: 4, background: 'var(--usa-white)' }}>
            {products.map((p) => (
              <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 14, cursor: 'pointer' }}>
                <input type="checkbox" value={p.id} {...register('productIds')} style={{ width: 16, height: 16 }} />
                {p.name}
              </label>
            ))}
          </div>
        </div>

        {mutation.isError && (
          <div className="usa-alert usa-alert--error" style={{ marginTop: 'var(--space-3)' }}>
            <div className="usa-alert__body">
              <p>{(mutation.error as any)?.response?.data?.error || 'Failed to save project.'}</p>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 'var(--space-1)', marginTop: 'var(--space-4)' }}>
          <button type="submit" className="usa-button usa-button--success" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : isEdit ? 'Update Project' : 'Create Project'}
          </button>
          <button type="button" className="usa-button usa-button--outline" onClick={() => navigate(-1)}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
