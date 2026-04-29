import api from './client';
import { DashboardStats, Role, FunctionalArea, Product, StatusPhase, RiskCategory } from '../types';

export const adminApi = {
  stats: () =>
    api.get('/admin/stats').then((r) => r.data.data as DashboardStats),

  roles: () =>
    api.get('/admin/roles').then((r) => r.data.data as Role[]),
  createRole: (data: Partial<Role>) =>
    api.post('/admin/roles', data).then((r) => r.data.data as Role),
  updateRole: (id: string, data: Partial<Role>) =>
    api.put(`/admin/roles/${id}`, data).then((r) => r.data.data as Role),
  deleteRole: (id: string) =>
    api.delete(`/admin/roles/${id}`).then((r) => r.data),
  roleUsage: (id: string) =>
    api.get(`/admin/roles/${id}/usage`).then((r) => r.data.data as { label: string; count: number }[]),

  functionalAreas: () =>
    api.get('/admin/functional-areas').then((r) => r.data.data as FunctionalArea[]),
  createFunctionalArea: (data: Partial<FunctionalArea>) =>
    api.post('/admin/functional-areas', data).then((r) => r.data.data as FunctionalArea),
  updateFunctionalArea: (id: string, data: Partial<FunctionalArea>) =>
    api.put(`/admin/functional-areas/${id}`, data).then((r) => r.data.data as FunctionalArea),
  deleteFunctionalArea: (id: string) =>
    api.delete(`/admin/functional-areas/${id}`).then((r) => r.data),
  functionalAreaUsage: (id: string) =>
    api.get(`/admin/functional-areas/${id}/usage`).then((r) => r.data.data as { label: string; count: number }[]),

  products: () =>
    api.get('/admin/products').then((r) => r.data.data as Product[]),
  createProduct: (data: Partial<Product>) =>
    api.post('/admin/products', data).then((r) => r.data.data as Product),
  updateProduct: (id: string, data: Partial<Product>) =>
    api.put(`/admin/products/${id}`, data).then((r) => r.data.data as Product),
  deleteProduct: (id: string) =>
    api.delete(`/admin/products/${id}`).then((r) => r.data),
  productUsage: (id: string) =>
    api.get(`/admin/products/${id}/usage`).then((r) => r.data.data as { label: string; count: number }[]),

  phases: () =>
    api.get('/admin/phases').then((r) => r.data.data as StatusPhase[]),
  createPhase: (data: Partial<StatusPhase>) =>
    api.post('/admin/phases', data).then((r) => r.data.data as StatusPhase),
  updatePhase: (id: string, data: Partial<StatusPhase>) =>
    api.put(`/admin/phases/${id}`, data).then((r) => r.data.data as StatusPhase),
  deletePhase: (id: string) =>
    api.delete(`/admin/phases/${id}`).then((r) => r.data),
  phaseUsage: (id: string) =>
    api.get(`/admin/phases/${id}/usage`).then((r) => r.data.data as { label: string; count: number }[]),

  riskCategories: () =>
    api.get('/admin/risk-categories').then((r) => r.data.data as RiskCategory[]),
  createRiskCategory: (data: Partial<RiskCategory>) =>
    api.post('/admin/risk-categories', data).then((r) => r.data.data as RiskCategory),
  updateRiskCategory: (id: string, data: Partial<RiskCategory>) =>
    api.put(`/admin/risk-categories/${id}`, data).then((r) => r.data.data as RiskCategory),
  deleteRiskCategory: (id: string) =>
    api.delete(`/admin/risk-categories/${id}`).then((r) => r.data),
  riskCategoryUsage: (id: string) =>
    api.get(`/admin/risk-categories/${id}/usage`).then((r) => r.data.data as { label: string; count: number }[]),

  users: () =>
    api.get('/admin/users').then((r) => r.data.data),

  createUser: (data: any) =>
    api.post('/admin/users', data).then((r) => r.data.data),

  updateUser: (id: string, data: any) =>
    api.put(`/admin/users/${id}`, data).then((r) => r.data.data),

  deactivateUser: (id: string) =>
    api.delete(`/admin/users/${id}`).then((r) => r.data.data),

  auditLog: (params?: Record<string, string>) =>
    api.get('/admin/audit-log', { params }).then((r) => r.data),
};
