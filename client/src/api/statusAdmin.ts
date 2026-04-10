import api from './client';
import { Department, StatusPriority, ExecutionType, CustomerCategory, RagDefinition, StatusDashboardStats, StatusTrendPoint } from '../types';

export const statusAdminApi = {
  dashboardStats: () =>
    api.get('/status-admin/dashboard-stats').then((r) => r.data.data as StatusDashboardStats),

  roadmap: () =>
    api.get('/status-admin/roadmap').then((r) => r.data.data),

  reports: () =>
    api.get('/status-admin/reports').then((r) => r.data.data),

  rollup: (params: { window?: string; programId?: string; startDate?: string; endDate?: string }) =>
    api.get('/status-admin/rollup', { params }).then((r) => r.data.data),

  departments: () =>
    api.get('/status-admin/departments').then((r) => r.data.data as Department[]),

  priorities: () =>
    api.get('/status-admin/priorities').then((r) => r.data.data as StatusPriority[]),

  executionTypes: () =>
    api.get('/status-admin/execution-types').then((r) => r.data.data as ExecutionType[]),

  customerCategories: () =>
    api.get('/status-admin/customer-categories').then((r) => r.data.data as CustomerCategory[]),

  ragDefinitions: () =>
    api.get('/status-admin/rag-definitions').then((r) => r.data.data as RagDefinition[]),

  trends: () =>
    api.get('/status-admin/trends').then((r) => r.data.data as Record<string, StatusTrendPoint[]>),
};
