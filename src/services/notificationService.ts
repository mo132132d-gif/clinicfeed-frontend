import { apiRequest } from "./api";
import { normalizeList, unwrapData } from "../lib/format";
import type { Notification, NotificationPreference } from "../types";

export async function listNotifications(limit = 10) {
  const query = new URLSearchParams({ limit: String(limit) });
  const payload = await apiRequest<unknown>(`/notifications?${query.toString()}`);
  return normalizeList<Notification>(payload);
}

export async function getUnreadNotificationCount() {
  const payload = await apiRequest<unknown>("/notifications/unread-count");
  const data = unwrapData<{ count?: number }>(payload);
  return Number(data?.count || 0);
}

export async function markNotificationRead(id: string) {
  const payload = await apiRequest<unknown>(`/notifications/${id}/read`, { method: "PATCH" });
  return unwrapData<Notification>(payload);
}

export async function listNotificationPreferences() {
  return [] as NotificationPreference[];
}

export async function updateNotificationPreference(id: string, enabled: boolean) {
  const payload = await apiRequest<unknown>(`/notification-preferences/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ enabled }),
  });
  return unwrapData<NotificationPreference>(payload);
}
