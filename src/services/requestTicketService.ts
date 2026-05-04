import { apiRequest } from "./api";
import { normalizeList, unwrapData } from "../lib/format";
import type { RequestTicket } from "../types";

export interface RequestTicketParams {
  view?: "active" | "completed" | "cancelled" | "all";
  status?: string;
  assigned_to?: string;
  search?: string;
}

export async function listRequestTickets(params?: RequestTicketParams) {
  const query = new URLSearchParams();

  if (params?.view) query.set("view", params.view);
  if (params?.status && params.status !== "all") query.set("status", params.status);
  if (params?.assigned_to) query.set("assigned_to", params.assigned_to);
  if (params?.search) query.set("search", params.search);

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
    body: JSON.stringify(data),
  });

  return unwrapData<RequestTicket>(payload);
}

export async function updateRequestTicket(id: string, data: Partial<RequestTicket>) {
  const payload = await apiRequest<{ data: RequestTicket }>(`/request-tickets/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

  return unwrapData<RequestTicket>(payload);
}

export async function deleteRequestTicket(id: string) {
  return apiRequest<{ data: RequestTicket }>(`/request-tickets/${id}`, {
    method: "DELETE",
  });
}
