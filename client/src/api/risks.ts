import api from './client';
import { Risk, RiskComment, RiskMitigationAction, RisksDashboardStats } from '../types';

export const risksApi = {
  dashboard: () =>
    api.get('/risks/dashboard').then((r) => r.data.data as RisksDashboardStats),

  list: (params?: Record<string, string>) =>
    api.get('/risks', { params }).then((r) => r.data.data as Risk[]),

  get: (id: string) =>
    api.get(`/risks/${id}`).then((r) => r.data.data as Risk),

  create: (data: any) =>
    api.post('/risks', data).then((r) => r.data.data as Risk),

  update: (id: string, data: any) =>
    api.put(`/risks/${id}`, data).then((r) => r.data.data as Risk),

  addComment: (id: string, text: string) =>
    api.post(`/risks/${id}/comments`, { text }).then((r) => r.data.data as RiskComment),

  addMitigationAction: (id: string, data: { title: string; dueDate: string; status: string; stepOwnerId?: string }) =>
    api.post(`/risks/${id}/mitigation-actions`, data).then((r) => r.data.data as RiskMitigationAction),

  updateMitigationAction: (id: string, actionId: string, data: { title?: string; dueDate?: string; status?: string; isComplete?: boolean; stepOwnerId?: string }) =>
    api.put(`/risks/${id}/mitigation-actions/${actionId}`, data).then((r) => r.data.data as RiskMitigationAction),

  deleteMitigationAction: (id: string, actionId: string) =>
    api.delete(`/risks/${id}/mitigation-actions/${actionId}`).then((r) => r.data.data as { id: string }),
};
