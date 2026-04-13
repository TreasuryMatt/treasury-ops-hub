import api from './client';
import { AppNotification, NotificationPreference, NotificationType } from '../types';

export interface NotificationsResponse {
  data: AppNotification[];
  unreadCount: number;
  nextCursor: string | null;
}

export async function fetchNotifications(params?: {
  cursor?: string;
  limit?: number;
  filter?: 'all' | 'unread';
}): Promise<NotificationsResponse> {
  const res = await api.get<NotificationsResponse>('/notifications', { params });
  return res.data;
}

export async function markRead(id: string): Promise<void> {
  await api.patch(`/notifications/${id}/read`);
}

export async function markAllRead(): Promise<void> {
  await api.patch('/notifications/read-all');
}

export async function deleteNotification(id: string): Promise<void> {
  await api.delete(`/notifications/${id}`);
}

export async function clearReadNotifications(): Promise<void> {
  await api.delete('/notifications');
}

export async function fetchPreferences(): Promise<NotificationPreference[]> {
  const res = await api.get<{ data: NotificationPreference[] }>('/notifications/preferences');
  return res.data.data;
}

export async function savePreferences(
  prefs: Array<{ type: NotificationType; inApp: boolean; email: boolean }>,
): Promise<NotificationPreference[]> {
  const res = await api.put<{ data: NotificationPreference[] }>('/notifications/preferences', prefs);
  return res.data.data;
}
