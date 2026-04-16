import api from './client';
import { IntakeDashboardStats, IntakeDetermination, IntakeDocument, IntakeSubmission, IntakeSubmissionVersion } from '../types';

export interface IntakeListResponse {
  data: IntakeSubmission[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export const intakeApi = {
  createDraft: (data: { title: string; formData: Record<string, any> }) =>
    api.post('/intake/submissions', data).then((r) => r.data.data as IntakeSubmission),

  listMine: () =>
    api.get('/intake/submissions/mine').then((r) => r.data.data as IntakeSubmission[]),

  listAll: (params?: Record<string, string>) =>
    api.get('/intake/submissions', { params }).then((r) => r.data as IntakeListResponse),

  get: (id: string) =>
    api.get(`/intake/submissions/${id}`).then((r) => r.data.data as IntakeSubmission),

  update: (id: string, data: { title?: string; formData: Record<string, any> }) =>
    api.put(`/intake/submissions/${id}`, data).then((r) => r.data.data as IntakeSubmission),

  submit: (id: string) =>
    api.post(`/intake/submissions/${id}/submit`).then((r) => r.data.data as IntakeSubmission),

  listVersions: (id: string) =>
    api.get(`/intake/submissions/${id}/versions`).then((r) => r.data.data as IntakeSubmissionVersion[]),

  uploadDocument: (id: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post(`/intake/submissions/${id}/documents`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data.data as IntakeDocument);
  },

  deleteDocument: (id: string, docId: string) =>
    api.delete(`/intake/submissions/${id}/documents/${docId}`).then((r) => r.data),

  documentDownloadUrl: (id: string, docId: string) =>
    `${api.defaults.baseURL}/intake/submissions/${id}/documents/${docId}/download`,

  dashboardStats: () =>
    api.get('/intake/dashboard/stats').then((r) => r.data.data as IntakeDashboardStats),

  score: (id: string) =>
    api.post(`/intake/submissions/${id}/score`).then((r) => r.data.data as IntakeSubmission),

  setDetermination: (
    id: string,
    data: {
      determination: IntakeDetermination;
      notes?: string;
      denialReason?: string;
      programId?: string;
    }
  ) => api.put(`/intake/submissions/${id}/determination`, data).then((r) => r.data.data as IntakeSubmission),

  generateDesignReview: (id: string) =>
    api.post(`/intake/submissions/${id}/design-review`).then((r) => r.data.data as IntakeSubmission),

  designReviewDownloadUrl: (id: string) =>
    `${api.defaults.baseURL}/intake/submissions/${id}/design-review/download`,

  assist: (data: { formData: Record<string, any>; userMessage: string }) =>
    api.post('/intake/ai/assist', data).then((r) => r.data.data as {
      reply: string;
      suggestions: Array<{ field: string; suggestion: string }>;
    }),
};
