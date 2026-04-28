import api from './client';
import { Risk, RiskComment } from '../types';

export const risksApi = {
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
};
