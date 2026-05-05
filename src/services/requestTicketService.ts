import { apiRequest, API_URL, ApiError, getStoredToken } from "./api";
import { normalizeList, unwrapData } from "../lib/format";
import { normalizeRequestTicketStatus } from "../lib/requestTicketStatus";
import type { RequestTicket, RequestTicketsSummary } from "../types";

export interface RequestTicketParams {
  view?: "pending" | "active" | "completed" | "cancelled" | "all";
  status?: string;
  assigned_to?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
}

function appendRequestTicketParams(query: URLSearchParams, params?: RequestTicketParams) {
  if (params?.view) query.set("view", params.view);
  if (params?.status && params.status !== "all") query.set("status", normalizeRequestTicketStatus(params.status));
  if (params?.assigned_to) query.set("assigned_to", params.assigned_to);
  if (params?.search) query.set("search", params.search);
  if (params?.date_from) query.set("date_from", params.date_from);
  if (params?.date_to) query.set("date_to", params.date_to);
}

function unwrapObject<T>(payload: unknown): T {
  const data = unwrapData<T>(payload);
  if (data && typeof data === "object") return data;
  return {} as T;
}

function normalizeRequestTicketPayload(data: Partial<RequestTicket>) {
  if (!("status" in data)) return data;
  return {
    ...data,
    status: normalizeRequestTicketStatus(data.status),
  };
}

export async function listRequestTickets(params?: RequestTicketParams) {
  const query = new URLSearchParams();
  appendRequestTicketParams(query, params);

  const qs = query.toString() ? `?${query.toString()}` : "";
  const payload = await apiRequest<unknown>(`/request-tickets${qs}`);

  return normalizeList<RequestTicket>(payload);
}

export async function getRequestTicket(id: string) {
  const payload = await apiRequest<{ data: RequestTicket }>(`/request-tickets/${id}`);
  return unwrapData<RequestTicket>(payload);
}

export async function createRequestTicket(data: Partial<RequestTicket>) {
  const payload = await apiRequest<{ data: RequestTicket }>("/request-tickets", {
    method: "POST",
    body: JSON.stringify(normalizeRequestTicketPayload(data)),
  });

  return unwrapData<RequestTicket>(payload);
}

export async function updateRequestTicket(id: string, data: Partial<RequestTicket>) {
  const payload = await apiRequest<{ data: RequestTicket }>(`/request-tickets/${id}`, {
    method: "PATCH",
    body: JSON.stringify(normalizeRequestTicketPayload(data)),
  });

  return unwrapData<RequestTicket>(payload);
}

export async function deleteRequestTicket(id: string) {
  return apiRequest<{ data: RequestTicket }>(`/request-tickets/${id}`, {
    method: "DELETE",
  });
}

export async function getRequestTicketsSummary() {
  const payload = await apiRequest<unknown>("/request-tickets/summary");
  return unwrapObject<RequestTicketsSummary>(payload);
}

export async function getDashboardRequestTicketsSummary() {
  const payload = await apiRequest<unknown>("/dashboard/request-tickets-summary");
  return unwrapObject<RequestTicketsSummary>(payload);
}

export async function exportRequestTickets(params?: RequestTicketParams) {
  if (!API_URL) {
    throw new ApiError("VITE_API_URL غير مهيأ لبيئة الإنتاج", 0);
  }

  const query = new URLSearchParams();
  appendRequestTicketParams(query, params);
  const qs = query.toString() ? `?${query.toString()}` : "";
  const headers = new Headers();
  const token = getStoredToken();

  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_URL}/request-tickets/export${qs}`, { headers });
  } catch {
    throw new ApiError("تعذر الاتصال بالخادم", 0);
  }

  if (response.status === 401) {
    throw new ApiError("انتهت الجلسة، الرجاء تسجيل الدخول مرة أخرى", 401);
  }

  if (!response.ok) {
    let message = "فشل تصدير البيانات";
    try {
      const payload = await response.json();
      message = payload?.error?.message || payload?.message || message;
    } catch {
      message = response.statusText || message;
    }
    throw new ApiError(message, response.status);
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") || response.headers.get("content-disposition") || "";
  const filenameMatch = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
  const filename = filenameMatch?.[1] ? decodeURIComponent(filenameMatch[1]) : "request-tickets.xlsx";

  return { blob, filename };
}
