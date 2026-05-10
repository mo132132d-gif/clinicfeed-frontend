import { apiRequest } from "./api";
import { normalizeList, unwrapData } from "../lib/format";
import { normalizeSaudiMobileNumber } from "../lib/phone";
import type { ActivityLog, Contact, Contract, Supplier, SupplierDocument, SupplierPerformance } from "../types";

export async function listSuppliers() {
  const chunkSize = 500;
  const all: Supplier[] = [];
  let offset = 0;

  while (true) {
    const payload = await apiRequest<{ data?: unknown; meta?: { total?: number } }>(
      `/suppliers?limit=${chunkSize}&offset=${offset}`
    );
    const page = normalizeList<Supplier>(payload);
    const total = payload.meta?.total;

    all.push(...page);

    if (page.length === 0) break;
    if (typeof total === "number" && all.length >= total) break;
    if (page.length < chunkSize) break;

    offset += page.length;
  }

  return all;
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
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return unwrapData<Supplier>(payload);
}

export async function archiveSupplier(id: string) {
  const payload = await apiRequest<{ data: Supplier }>(`/suppliers/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "Inactive" }),
  });
  return unwrapData<Supplier>(payload);
}

export async function listContacts(supplierId: string) {
  const payload = await apiRequest<unknown>(
    `/contacts?supplier_id=${encodeURIComponent(supplierId)}&limit=500`
  );
  return normalizeList<Contact>(payload);
}

export async function createContact(supplierId: string, data: Partial<Contact>) {
  const payload = await apiRequest<{ data: Contact }>("/contacts", {
    method: "POST",
    body: JSON.stringify({
      ...data,
      supplier_id: supplierId,
      phone: data.phone ? normalizeSaudiMobileNumber(data.phone) : data.phone,
      whatsapp: data.whatsapp ? normalizeSaudiMobileNumber(data.whatsapp) : data.whatsapp,
    }),
  });
  return unwrapData<Contact>(payload);
}

export async function updateContact(id: string, data: Partial<Contact>) {
  const payload = await apiRequest<{ data: Contact }>(`/contacts/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      ...data,
      phone: data.phone ? normalizeSaudiMobileNumber(data.phone) : data.phone,
      whatsapp: data.whatsapp ? normalizeSaudiMobileNumber(data.whatsapp) : data.whatsapp,
    }),
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
  const payload = await apiRequest<unknown>(
    `/contracts?supplier_id=${encodeURIComponent(supplierId)}&limit=500`
  );
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

  const payload = await apiRequest<{ data: Contract }>("/contracts", {
    method: "POST",
    body: JSON.stringify({ ...data, supplier_id: supplierId }),
  });
  return unwrapData<Contract>(payload);
}

export async function updateContract(id: string, data: Partial<Contract>, file?: File | null) {
  const payload = await apiRequest<{ data: Contract }>(`/contracts/${id}`, {
    method: "PATCH",
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
  const payload = await apiRequest<unknown>(
    `/documents?supplier_id=${encodeURIComponent(supplierId)}&limit=500`
  );
  return normalizeList<SupplierDocument>(payload);
}

export async function listAllDocuments() {
  const chunkSize = 500;
  const all: SupplierDocument[] = [];
  let offset = 0;

  while (true) {
    const payload = await apiRequest<{ data?: unknown; meta?: { total?: number } }>(
      `/documents?limit=${chunkSize}&offset=${offset}`
    );
    const page = normalizeList<SupplierDocument>(payload);
    const total = payload.meta?.total;

    all.push(...page);

    if (page.length === 0) break;
    if (typeof total === "number" && all.length >= total) break;
    if (page.length < chunkSize) break;

    offset += page.length;
  }

  return all;
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

  const payload = await apiRequest<{ data: SupplierDocument }>("/documents", {
    method: "POST",
    body: JSON.stringify({ ...data, supplier_id: supplierId }),
  });
  return unwrapData<SupplierDocument>(payload);
}

export async function updateDocument(id: string, data: Partial<SupplierDocument>, file?: File | null) {
  const payload = await apiRequest<{ data: SupplierDocument }>(`/documents/${id}`, {
    method: "PATCH",
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

export async function deleteDocument(id: string) {
  return apiRequest<{ data: SupplierDocument }>(`/documents/${id}`, { method: "DELETE" });
}

export async function listSupplierActivity(supplierId: string) {
  const params = new URLSearchParams({
    entity_id: supplierId,
    entity_type: "Supplier",
    limit: "500",
    offset: "0",
  });
  const payload = await apiRequest<unknown>(`/activity-logs?${params.toString()}`);
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

  const payload = await apiRequest<{ data: {
    totalRows: number;
    imported: number;
    updated: number;
    contactsCreated: number;
    contactsUpdated: number;
    skipped: number;
    incomplete: number;
    duplicates: number;
    failed: number;
    failedRows: Array<{ rowNumber: number; reason: string }>;
    importedSuppliers: number;
    updatedSuppliers: number;
    importedContacts: number;
    updatedContacts: number;
    skippedRows: number;
    missingPhone: number;
    missingEmail: number;
    errors: Array<{ rowNumber: number; reason: string }>;
  } }>("/suppliers/import", {
    method: "POST",
    body: form,
  });

  return unwrapData(payload);
}

export async function previewSupplierImport(file: File) {
  const form = new FormData();
  form.append("file", file);

  const payload = await apiRequest<{ data: {
    dryRun: true;
    totalRows: number;
    imported: number;
    updated: number;
    contactsCreated: number;
    contactsUpdated: number;
    skipped: number;
    incomplete: number;
    importedSuppliers: number;
    updatedSuppliers: number;
    importedContacts: number;
    updatedContacts: number;
    skippedRows: number;
    missingPhone: number;
    missingEmail: number;
    errors: Array<{ rowNumber: number; reason: string }>;
    duplicates: number;
    failed: number;
    failedRows: Array<{ rowNumber: number; reason: string }>;
  } }>("/suppliers/import/preview", {
    method: "POST",
    body: form,
  });

  return unwrapData(payload);
}

