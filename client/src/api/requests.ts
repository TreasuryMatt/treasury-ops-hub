import api from './client';
import { ResourceRequest } from '../types';

export const requestsApi = {
  list: (params?: Record<string, string>) =>
    api.get('/requests', { params }).then((r) => r.data.data as ResourceRequest[]),

  create: (data: Partial<ResourceRequest>) =>
    api.post('/requests', data).then((r) => r.data.data as ResourceRequest),

  review: (id: string, data: { status: 'approved' | 'denied'; reviewNote?: string; resourceId?: string }) =>
    api.put(`/requests/${id}/review`, data).then((r) => r.data.data as ResourceRequest),

  remove: (id: string) =>
    api.delete(`/requests/${id}`).then((r) => r.data),
};
