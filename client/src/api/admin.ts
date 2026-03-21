import api from './client';
import { DashboardStats, Role, FunctionalArea, Product } from '../types';

export const adminApi = {
  stats: () =>
    api.get('/admin/stats').then((r) => r.data.data as DashboardStats),

  roles: () =>
    api.get('/admin/roles').then((r) => r.data.data as Role[]),

  createRole: (data: Partial<Role>) =>
    api.post('/admin/roles', data).then((r) => r.data.data as Role),

  functionalAreas: () =>
    api.get('/admin/functional-areas').then((r) => r.data.data as FunctionalArea[]),

  createFunctionalArea: (data: Partial<FunctionalArea>) =>
    api.post('/admin/functional-areas', data).then((r) => r.data.data as FunctionalArea),

  products: () =>
    api.get('/admin/products').then((r) => r.data.data as Product[]),

  createProduct: (data: Partial<Product>) =>
    api.post('/admin/products', data).then((r) => r.data.data as Product),

  users: () =>
    api.get('/admin/users').then((r) => r.data.data),

  createUser: (data: any) =>
    api.post('/admin/users', data).then((r) => r.data.data),

  updateUser: (id: string, data: any) =>
    api.put(`/admin/users/${id}`, data).then((r) => r.data.data),

  auditLog: (params?: Record<string, string>) =>
    api.get('/admin/audit-log', { params }).then((r) => r.data),
};
