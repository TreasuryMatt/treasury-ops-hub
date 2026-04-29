import api from './client';
import { IssuesDashboardStats, Risk, RiskComment, RiskMitigationAction } from '../types';

export const issuesApi = {
  dashboard: () =>
    api.get('/issues/dashboard').then((r) => r.data.data as IssuesDashboardStats),

  list: (params?: Record<string, string>) =>
    api.get('/issues', { params }).then((r) => r.data.data as Risk[]),

  get: (id: string) =>
    api.get(`/issues/${id}`).then((r) => r.data.data as Risk),

  update: (id: string, data: any) =>
    api.put(`/issues/${id}`, data).then((r) => r.data.data as Risk),

  addComment: (id: string, text: string) =>
    api.post(`/issues/${id}/comments`, { text }).then((r) => r.data.data as RiskComment),

  addMitigationAction: (id: string, data: { title: string; dueDate: string; status: string }) =>
    api.post(`/issues/${id}/mitigation-actions`, data).then((r) => r.data.data as RiskMitigationAction),

  updateMitigationAction: (id: string, actionId: string, data: { title?: string; dueDate?: string; status?: string; isComplete?: boolean }) =>
    api.put(`/issues/${id}/mitigation-actions/${actionId}`, data).then((r) => r.data.data as RiskMitigationAction),

  deleteMitigationAction: (id: string, actionId: string) =>
    api.delete(`/issues/${id}/mitigation-actions/${actionId}`).then((r) => r.data.data as { id: string }),
};
