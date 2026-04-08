import api from './client';
import { Portfolio } from '../types';

export const portfoliosApi = {
  list: () =>
    api.get('/portfolios').then((r) => r.data.data as Portfolio[]),

  create: (data: any) =>
    api.post('/portfolios', data).then((r) => r.data.data as Portfolio),

  update: (id: string, data: any) =>
    api.put(`/portfolios/${id}`, data).then((r) => r.data.data as Portfolio),
};
