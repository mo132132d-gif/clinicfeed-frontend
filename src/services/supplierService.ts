import { apiRequest } from "./api";
import { normalizeList, unwrapData } from "../lib/format";
import type { ActivityLog, Contact, Contract, Supplier, SupplierDocument, SupplierPerformance } from "../types";

export async function listSuppliers() {
  const payload = await apiRequest<unknown>("/suppliers?limit=500");
  return normalizeList<Supplier>(payload);
}

export async function getSupplier(id: string) {
  const payload = await apiRequest<{ data: Supplier }>(`/suppliers/${id}`);
  return unwrapData<Supplier>(payload);
}

export async function createSupplier(data: Partial<Supplier>) {
  const payload = await apiRequest<{ data: Supplier }>("/suppliers", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return unwrapData<Supplier>(payload);
}

export async function updateSupplier(id: string, data: Partial<Supplier>) {
  const payload = await apiRequest<{ data: Supplier }>(`/suppliers/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return unwrapData<Supplier>(payload);
}

export async function archiveSupplier(id: string) {
  const payload = await apiRequest<{ data: Supplier }>(`/suppliers/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: "Inactive" }),
  });
  return unwrapData<Supplier>(payload);
}

export async function listContacts(supplierId: string) {
  const payload = await apiRequest<unknown>(`/suppliers/${supplierId}/contacts?limit=100`);
  return normalizeList<Contact>(payload);
}

export async function createContact(supplierId: string, data: Partial<Contact>) {
  const payload = await apiRequest<{ data: Contact }>(`/suppliers/${supplierId}/contacts`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return unwrapData<Contact>(payload);
}

export async function updateContact(id: string, data: Partial<Contact>) {
  const payload = await apiRequest<{ data: Contact }>(`/contacts/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return unwrapData<Contact>(payload);
}

export async function deleteContact(id: string) {
  return apiRequest<{ data: Contact }>(`/contacts/${id}`, { method: "DELETE" });
}

export async function markPrimaryContact(id: string) {
  const payload = await apiRequest<{ data: Contact }>(`/contacts/${id}/primary`, { method: "PATCH" });
  return unwrapData<Contact>(payload);
}

export async function listContracts(supplierId: string) {
  const payload = await apiRequest<unknown>(`/suppliers/${supplierId}/contracts?limit=100`);
  return normalizeList<Contract>(payload);
}

export async function createContract(supplierId: string, data: Partial<Contract>, file?: File | null) {
  if (file) {
    const form = new FormData();
    Object.entries(data).forEach(([key, value]) => value !== undefined && value !== null && form.append(key, String(value)));
    form.append("file", file);
    const payload = await apiRequest<{ data: Contract }>(`/suppliers/${supplierId}/contracts/upload`, {
      method: "POST",
      body: form,
    });
    return unwrapData<Contract>(payload);
  }

  const payload = await apiRequest<{ data: Contract }>(`/suppliers/${supplierId}/contracts`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return unwrapData<Contract>(payload);
}

export async function updateContract(id: string, data: Partial<Contract>, file?: File | null) {
  const payload = await apiRequest<{ data: Contract }>(`/contracts/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  const contract = unwrapData<Contract>(payload);
  if (file) {
    const form = new FormData();
    form.append("file", file);
    const uploaded = await apiRequest<{ data: Contract }>(`/contracts/${id}/upload`, {
      method: "POST",
      body: form,
    });
    return unwrapData<Contract>(uploaded);
  }
  return contract;
}

export async function listDocuments(supplierId: string) {
  const payload = await apiRequest<unknown>(`/suppliers/${supplierId}/documents?limit=100`);
  return normalizeList<SupplierDocument>(payload);
}

export async function createDocument(supplierId: string, data: Partial<SupplierDocument>, file?: File | null) {
  if (file) {
    const form = new FormData();
    Object.entries(data).forEach(([key, value]) => value !== undefined && value !== null && form.append(key, String(value)));
    form.append("file", file);
    const payload = await apiRequest<{ data: SupplierDocument }>(`/suppliers/${supplierId}/documents/upload`, {
      method: "POST",
      body: form,
    });
    return unwrapData<SupplierDocument>(payload);
  }

  const payload = await apiRequest<{ data: SupplierDocument }>(`/suppliers/${supplierId}/documents`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return unwrapData<SupplierDocument>(payload);
}

export async function updateDocument(id: string, data: Partial<SupplierDocument>, file?: File | null) {
  const payload = await apiRequest<{ data: SupplierDocument }>(`/documents/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  const document = unwrapData<SupplierDocument>(payload);
  if (file) {
    const form = new FormData();
    form.append("file", file);
    const uploaded = await apiRequest<{ data: SupplierDocument }>(`/documents/${id}/upload`, {
      method: "POST",
      body: form,
    });
    return unwrapData<SupplierDocument>(uploaded);
  }
  return document;
}

export async function listSupplierActivity(supplierId: string) {
  const payload = await apiRequest<unknown>(`/suppliers/${supplierId}/activity-logs`);
  return normalizeList<ActivityLog>(payload);
}

export async function getSupplierPerformance(supplierId: string) {
  const payload = await apiRequest<{ data: SupplierPerformance | null }>(`/suppliers/${supplierId}/performance`);
  return unwrapData<SupplierPerformance | null>(payload);
}

export async function updateSupplierPerformance(supplierId: string, data: SupplierPerformance) {
  const payload = await apiRequest<{ data: SupplierPerformance }>(`/suppliers/${supplierId}/performance`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return unwrapData<SupplierPerformance>(payload);
}

export async function listSupplierPerformance() {
  const payload = await apiRequest<unknown>("/supplier-performance");
  return normalizeList<SupplierPerformance>(payload);
}

export async function importSuppliers(file: File) {
  const form = new FormData();
  form.append("file", file);

  return apiRequest<{
    message: string;
    imported: number;
    skipped: number;
    incomplete: number;
  }>("/suppliers/import", {
    method: "POST",
    body: form,
  });
}