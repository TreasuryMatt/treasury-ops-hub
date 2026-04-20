import api from './client';
import { Application } from '../types';

export const applicationsApi = {
  list: (params?: { programId?: string }) =>
    api.get('/applications', { params }).then((r) => r.data.data as Application[]),

  get: (id: string) =>
    api.get(`/applications/${id}`).then((r) => r.data.data as Application),

  create: (data: any) =>
    api.post('/applications', data).then((r) => r.data.data as Application),

  update: (id: string, data: any) =>
    api.put(`/applications/${id}`, data).then((r) => r.data.data as Application),

  remove: (id: string) =>
    api.delete(`/applications/${id}`).then((r) => r.data),
};
