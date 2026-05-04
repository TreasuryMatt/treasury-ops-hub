import api from './client';
import { Resource, PaginatedResponse } from '../types';

export const resourcesApi = {
  list: (params?: Record<string, string>) =>
    api.get('/resources', { params }).then((r) => r.data as PaginatedResponse<Resource>),

  get: (id: string) =>
    api.get(`/resources/${id}`).then((r) => r.data.data as Resource),

  create: (data: Partial<Resource>) =>
    api.post('/resources', data).then((r) => r.data.data as Resource),

  update: (id: string, data: Partial<Resource>) =>
    api.put(`/resources/${id}`, data).then((r) => r.data.data as Resource),

  remove: (id: string) =>
    api.delete(`/resources/${id}`).then((r) => r.data),

  supervisors: () =>
    api.get('/resources/supervisors').then((r) => r.data.data as Array<{ id: string; firstName: string; lastName: string; division: string }>),

  linkableUsers: () =>
    api.get('/resources/linkable-users').then((r) => r.data.data as Array<{ id: string; displayName: string; email: string; resource: { id: string } | null }>),
};
