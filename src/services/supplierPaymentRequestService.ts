import { apiRequest } from "./api";
import { normalizeList, unwrapData } from "../lib/format";
import type {
  SupplierPaymentRequest,
  SupplierPaymentRequestDocument,
  SupplierPaymentRequestDocumentType,
  SupplierPaymentRequestsSummary,
} from "../types";

export interface SupplierPaymentRequestParams {
  q?: string;
  status?: string;
  supplier_id?: string;
  assigned_to?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export interface SupplierPaymentRequestListResult {
  data: SupplierPaymentRequest[];
  meta?: {
    total?: number;
    limit?: number;
    offset?: number;
  };
  summary?: SupplierPaymentRequestsSummary;
}

function appendParams(query: URLSearchParams, params?: SupplierPaymentRequestParams) {
  if (!params) return;

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "" && value !== "all") {
      query.set(key, String(value));
    }
  });
}

function compactPayload<T extends Record<string, unknown>>(payload: T) {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
}

function paymentRequestPayload(data: Partial<SupplierPaymentRequest>) {
  const supplierIds = Array.isArray(data.supplier_ids)
    ? [...new Set(data.supplier_ids.filter(Boolean).map(String))]
    : [];
  const supplierId = data.supplier_id ? String(data.supplier_id) : supplierIds[0] || null;
  const linkedSupplierIds = supplierId && !supplierIds.includes(supplierId)
    ? [supplierId, ...supplierIds]
    : supplierIds;

  return compactPayload({
    supplier_id: supplierId,
    supplier_ids: linkedSupplierIds,
    amount: data.amount,
    status: data.status,
    priority: data.priority,
    due_date: data.due_date || null,
    payment_method: data.payment_method || null,
    invoice_number: data.invoice_number || null,
    reference_number: data.reference_number || null,
    assigned_to: data.assigned_to || null,
    notes: data.notes || null,
  });
}

export async function listSupplierPaymentRequests(params?: SupplierPaymentRequestParams): Promise<SupplierPaymentRequestListResult> {
  const query = new URLSearchParams();
  appendParams(query, params);
  const qs = query.toString() ? `?${query.toString()}` : "";
  const payload = await apiRequest<SupplierPaymentRequestListResult>(`/supplier-payment-requests${qs}`);

  return {
    data: normalizeList<SupplierPaymentRequest>(payload),
    meta: payload.meta,
    summary: payload.summary,
  };
}

export async function getSupplierPaymentRequest(id: string) {
  const payload = await apiRequest<{ data: SupplierPaymentRequest }>(`/supplier-payment-requests/${id}`);
  return unwrapData<SupplierPaymentRequest>(payload);
}

export async function createSupplierPaymentRequest(data: Partial<SupplierPaymentRequest>) {
  const payload = await apiRequest<{ data: SupplierPaymentRequest }>("/supplier-payment-requests", {
    method: "POST",
    body: JSON.stringify(paymentRequestPayload(data)),
  });

  return unwrapData<SupplierPaymentRequest>(payload);
}

export async function updateSupplierPaymentRequest(id: string, data: Partial<SupplierPaymentRequest>) {
  const payload = await apiRequest<{ data: SupplierPaymentRequest }>(`/supplier-payment-requests/${id}`, {
    method: "PUT",
    body: JSON.stringify(paymentRequestPayload(data)),
  });

  return unwrapData<SupplierPaymentRequest>(payload);
}

export async function deleteSupplierPaymentRequest(id: string) {
  return apiRequest<{ data: SupplierPaymentRequest }>(`/supplier-payment-requests/${id}`, {
    method: "DELETE",
  });
}

export async function uploadSupplierPaymentRequestDocument(
  id: string,
  fileOrPayload: File | { file: File; document_type?: SupplierPaymentRequestDocumentType | string; documentType?: SupplierPaymentRequestDocumentType | string },
  documentType?: SupplierPaymentRequestDocumentType | string,
) {
  const file = fileOrPayload instanceof File ? fileOrPayload : fileOrPayload.file;
  const type = fileOrPayload instanceof File
    ? documentType || "Other"
    : fileOrPayload.document_type || fileOrPayload.documentType || "Other";
  const form = new FormData();
  form.append("document_type", type);
  form.append("file", file);

  const payload = await apiRequest<{ data: SupplierPaymentRequestDocument }>(
    `/supplier-payment-requests/${id}/documents/upload`,
    {
      method: "POST",
      body: form,
    },
  );

  return unwrapData<SupplierPaymentRequestDocument>(payload);
}

export async function listSupplierPaymentRequestDocuments(id: string) {
  const payload = await apiRequest<unknown>(`/supplier-payment-requests/${id}/documents`);
  return normalizeList<SupplierPaymentRequestDocument>(payload);
}

export async function deleteSupplierPaymentRequestDocument(id: string, documentId: string) {
  return apiRequest<{ data: SupplierPaymentRequestDocument }>(
    `/supplier-payment-requests/${id}/documents/${documentId}`,
    { method: "DELETE" },
  );
}
