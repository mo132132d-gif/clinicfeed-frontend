import { apiRequest } from "./api";
import { unwrapData } from "../lib/format";
import type { Notification, NotificationPreference } from "../types";

export async function listNotifications(_limit = 10) {
  return [] as Notification[];
}

export async function getUnreadNotificationCount() {
  return 0;
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
