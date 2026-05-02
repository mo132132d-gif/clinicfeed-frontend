import { apiRequest } from "./api";
import { normalizeList, unwrapData } from "../lib/format";
import type { ActivityLog } from "../types";

export async function listActivity(limit = 50) {
  const payload = await apiRequest<unknown>(`/activity-logs?limit=${limit}`);
  return normalizeList<ActivityLog>(payload);
}

export async function getAlerts() {
  const payload = await apiRequest<unknown>("/alerts");
  return unwrapData<Record<string, unknown>>(payload) || {};
}
