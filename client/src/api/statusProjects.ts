import api from './client';
import { StatusProject, StatusUpdate, ProjectPhase, Accomplishment, ProjectDocument } from '../types';

export const statusProjectsApi = {
  list: (params?: Record<string, string>) =>
    api.get('/status-projects', { params }).then((r) => r.data.data as StatusProject[]),

  get: (id: string) =>
    api.get(`/status-projects/${id}`).then((r) => r.data.data as StatusProject),

  create: (data: any) =>
    api.post('/status-projects', data).then((r) => r.data.data as StatusProject),

  update: (id: string, data: any) =>
    api.put(`/status-projects/${id}`, data).then((r) => r.data.data as StatusProject),

  // Updates
  listUpdates: (projectId: string) =>
    api.get(`/status-projects/${projectId}/updates`).then((r) => r.data.data as StatusUpdate[]),

  createUpdate: (projectId: string, data: any) =>
    api.post(`/status-projects/${projectId}/updates`, data).then((r) => r.data.data as StatusUpdate),

  updateUpdate: (projectId: string, updateId: string, data: any) =>
    api.put(`/status-projects/${projectId}/updates/${updateId}`, data).then((r) => r.data.data as StatusUpdate),

  deleteUpdate: (projectId: string, updateId: string) =>
    api.delete(`/status-projects/${projectId}/updates/${updateId}`).then((r) => r.data),

  // Phases
  listPhases: (projectId: string) =>
    api.get(`/status-projects/${projectId}/phases`).then((r) => r.data.data as ProjectPhase[]),

  createPhase: (projectId: string, data: any) =>
    api.post(`/status-projects/${projectId}/phases`, data).then((r) => r.data.data as ProjectPhase),

  updatePhase: (projectId: string, phaseId: string, data: any) =>
    api.put(`/status-projects/${projectId}/phases/${phaseId}`, data).then((r) => r.data.data as ProjectPhase),

  // Accomplishments
  listAccomplishments: (projectId: string) =>
    api.get(`/status-projects/${projectId}/accomplishments`).then((r) => r.data.data as Accomplishment[]),

  createAccomplishment: (projectId: string, data: { text: string }) =>
    api.post(`/status-projects/${projectId}/accomplishments`, data).then((r) => r.data.data as Accomplishment),

  updateAccomplishment: (projectId: string, aId: string, data: { text: string }) =>
    api.put(`/status-projects/${projectId}/accomplishments/${aId}`, data).then((r) => r.data.data as Accomplishment),

  deleteAccomplishment: (projectId: string, aId: string) =>
    api.delete(`/status-projects/${projectId}/accomplishments/${aId}`).then((r) => r.data),

  // Documents
  listDocuments: (projectId: string) =>
    api.get(`/status-projects/${projectId}/documents`).then((r) => r.data.data as ProjectDocument[]),

  uploadDocument: (projectId: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post(`/status-projects/${projectId}/documents`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data.data as ProjectDocument);
  },

  deleteDocument: (projectId: string, docId: string) =>
    api.delete(`/status-projects/${projectId}/documents/${docId}`).then((r) => r.data),

  // Staffing cross-reference
  getStaffing: (projectId: string) =>
    api.get(`/status-projects/${projectId}/staffing`).then((r) => r.data as { data: any[]; linkedProjectId: string | null }),

  ensureLinkedProject: (projectId: string) =>
    api.post(`/status-projects/${projectId}/staffing/ensure-project`).then((r) => r.data.linkedProjectId as string),
};
