import api from './client';
import { Product } from '../types';

export const productsApi = {
  list: (params?: { programId?: string; productType?: string; productStatus?: string }) =>
    api.get('/products', { params }).then((r) => r.data.data as Product[]),

  get: (id: string) =>
    api.get(`/products/${id}`).then((r) => r.data.data as Product),

  create: (data: any) =>
    api.post('/products', data).then((r) => r.data.data as Product),

  update: (id: string, data: any) =>
    api.put(`/products/${id}`, data).then((r) => r.data.data as Product),

  remove: (id: string) =>
    api.delete(`/products/${id}`).then((r) => r.data),

  setProjects: (id: string, statusProjectIds: string[]) =>
    api.put(`/products/${id}/projects`, { statusProjectIds }).then((r) => r.data),
};
