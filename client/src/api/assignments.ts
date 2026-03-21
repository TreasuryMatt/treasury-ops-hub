import api from './client';
import { Assignment } from '../types';

export const assignmentsApi = {
  create: (data: Partial<Assignment>) =>
    api.post('/assignments', data).then((r) => r.data.data as Assignment),

  update: (id: string, data: Partial<Assignment>) =>
    api.put(`/assignments/${id}`, data).then((r) => r.data.data as Assignment),

  remove: (id: string) =>
    api.delete(`/assignments/${id}`).then((r) => r.data),
};
