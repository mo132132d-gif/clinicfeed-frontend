import { apiRequest } from "./api";
import { normalizeList, unwrapData } from "../lib/format";

export interface SupplierPaymentRequest {
  id: string;
  request_number: string;
  supplier_id?: string | null;
  amount: number | string;
  currency?: string | null;
  payment_reason: string;
  description?: string | null;
  priority: string;
  status: string;
  due_date?: string | null;
  manager_notes?: string | null;
  rejection_reason?: string | null;
  paid_amount?: number | string | null;
  paid_at?: string | null;
  created_at?: string;
  updated_at?: string;
  supplier_name_ar?: string | null;
  supplier_name_en?: string | null;
}

export async function listSupplierPaymentRequests(params?: { search?: string; status?: string }) {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.status && params.status !== "all") query.set("status", params.status);
  const qs = query.toString() ? `?${query.toString()}` : "";
  const payload = await apiRequest<unknown>(`/supplier-payment-requests${qs}`);
  return normalizeList<SupplierPaymentRequest>(payload);
}

export async function createSupplierPaymentRequest(data: Partial<SupplierPaymentRequest>) {
  const payload = await apiRequest<{ data: SupplierPaymentRequest }>("/supplier-payment-requests", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return unwrapData<SupplierPaymentRequest>(payload);
}

export async function updateSupplierPaymentRequest(id: string, data: Partial<SupplierPaymentRequest>) {
  const payload = await apiRequest<{ data: SupplierPaymentRequest }>(`/supplier-payment-requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return unwrapData<SupplierPaymentRequest>(payload);
}

export async function deleteSupplierPaymentRequest(id: string) {
  return apiRequest(`/supplier-payment-requests/${id}`, { method: "DELETE" });
}
