import api from './client';
import { Project, PaginatedResponse, ProjectsDashboardStats } from '../types';

export const projectsApi = {
  stats: () =>
    api.get('/projects/stats').then((r) => r.data.data as ProjectsDashboardStats),

  list: (params?: Record<string, string>) =>
    api.get('/projects', { params }).then((r) => r.data as PaginatedResponse<Project>),

  get: (id: string) =>
    api.get(`/projects/${id}`).then((r) => r.data.data as Project),

  create: (data: Partial<Project>) =>
    api.post('/projects', data).then((r) => r.data.data as Project),

  update: (id: string, data: Partial<Project>) =>
    api.put(`/projects/${id}`, data).then((r) => r.data.data as Project),

  remove: (id: string) =>
    api.delete(`/projects/${id}`).then((r) => r.data),
};
