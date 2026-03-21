import api from './client';
import { AuthUser } from '../types';

export const authApi = {
  mockLogin: (caiaId: string) =>
    api.post('/auth/mock-login', { caiaId }).then((r) => r.data.data as { token: string; user: AuthUser }),

  me: () =>
    api.get('/auth/me').then((r) => r.data.data as AuthUser),

  logout: () =>
    api.post('/auth/logout').then((r) => r.data),
};
