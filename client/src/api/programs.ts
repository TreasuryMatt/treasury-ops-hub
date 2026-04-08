import api from './client';
import { Program } from '../types';

export const programsApi = {
  list: () =>
    api.get('/programs').then((r) => r.data.data as Program[]),

  get: (id: string) =>
    api.get(`/programs/${id}`).then((r) => r.data.data as Program),

  create: (data: any) =>
    api.post('/programs', data).then((r) => r.data.data as Program),

  update: (id: string, data: any) =>
    api.put(`/programs/${id}`, data).then((r) => r.data.data as Program),

  remove: (id: string) =>
    api.delete(`/programs/${id}`).then((r) => r.data),
};
