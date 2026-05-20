import { apiRequest, API_URL, ApiError, getStoredToken, mapApiErrorMessage } from "./api";

export const dailyReportSections = [
  { id: "executive_summary", label: "الملخص التنفيذي" },
  { id: "suppliers_added", label: "الموردين المضافين اليوم" },
  { id: "suppliers_updated", label: "الموردين الذين تم تحديث بياناتهم" },
  { id: "incomplete_suppliers", label: "الموردين ذوي البيانات الناقصة" },
  { id: "request_tickets", label: "تذاكر الطلبات اليومية" },
  { id: "ticket_metrics", label: "مؤشرات التذاكر" },
  { id: "supplier_payments", label: "سداد الموردين" },
  { id: "operational_summary", label: "الملخص التشغيلي اليومي" },
] as const;

export type DailyReportSection = typeof dailyReportSections[number]["id"];

export interface DailyReportOptions {
  date: string;
  sections: DailyReportSection[];
}

export interface SupplierReportOptions {
  fromDate: string;
  toDate: string;
  status?: string;
  category?: string;
  region?: string;
  includeOnlyAddedDuringPeriod?: boolean;
  hasExpiringDocuments?: boolean;
}

export interface SupplierReportPreview {
  range: {
    from: string;
    to: string;
    label: string;
  };
  filters: {
    status: string;
    category: string;
    region: string;
    includeOnlyAddedDuringPeriod: boolean;
    hasExpiringDocuments: boolean;
  };
  totalSuppliers: number;
  activeSuppliers: number;
  pendingSuppliers: number;
  suppliersAddedDuringPeriod: number;
  suppliersUpdatedDuringPeriod: number;
  suppliersWithNoDocuments: number;
  suppliersWithExpiringDocuments: number;
  suppliersWithExpiredDocuments: number;
  suppliersMissingData: number;
  topCategories: Array<{ category: string; count: number }>;
  topRegions: Array<{ region: string; count: number }>;
  statusDistribution: Array<{ status: string; count: number }>;
  documentsAvailable: boolean;
}

function dailyReportQuery(options: DailyReportOptions) {
  const query = new URLSearchParams();
  if (options.date) query.set("date", options.date);
  if (options.sections.length > 0) query.set("sections", options.sections.join(","));
  return query.toString();
}

function supplierReportQuery(options: SupplierReportOptions) {
  const query = new URLSearchParams();
  query.set("from", options.fromDate);
  query.set("to", options.toDate);

  if (options.status) query.set("status", options.status);
  if (options.category) query.set("category", options.category);
  if (options.region) query.set("region", options.region);
  if (options.includeOnlyAddedDuringPeriod) query.set("added_during_period", String(options.includeOnlyAddedDuringPeriod));
  if (options.hasExpiringDocuments) query.set("has_expiring_documents", String(options.hasExpiringDocuments));

  return query.toString();
}

async function downloadBlob(path: string, options: SupplierReportOptions, fallbackName: string) {
  if (!API_URL) {
    throw new ApiError("رابط الخادم غير مهيأ للبيئة الحالية", 0);
  }

  const headers = new Headers();
  const token = getStoredToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}?${supplierReportQuery(options)}`, { headers });
  if (!response.ok) {
    let message = "";
    try {
      const payload = await response.json();
      message = payload?.error?.message || payload?.message || "";
    } catch {
      message = response.statusText || "";
    }
    throw new ApiError(mapApiErrorMessage(response.status, message, path), response.status);
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") || response.headers.get("content-disposition") || "";
  const filenameMatch = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
  const filename = filenameMatch?.[1] ? decodeURIComponent(filenameMatch[1]) : fallbackName;
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

export async function downloadDailyReportPdf(options: DailyReportOptions) {
  if (!API_URL) {
    throw new ApiError("رابط الخادم غير مهيأ للبيئة الحالية", 0);
  }

  const headers = new Headers();
  const token = getStoredToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_URL}/reports/daily/pdf?${dailyReportQuery(options)}`, { headers });
  if (!response.ok) {
    let message = "";
    try {
      const payload = await response.json();
      message = payload?.error?.message || payload?.message || "";
    } catch {
      message = response.statusText || "";
    }
    throw new ApiError(mapApiErrorMessage(response.status, message, "/reports/daily/pdf"), response.status);
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") || response.headers.get("content-disposition") || "";
  const filenameMatch = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
  const filename = filenameMatch?.[1] ? decodeURIComponent(filenameMatch[1]) : `clinicfeed-daily-report-${options.date}.pdf`;
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

export async function sendDailyReportEmail(options: DailyReportOptions) {
  return apiRequest<{ data: { success: boolean; date: string; recipient: string; filename: string } }>("/reports/daily/send", {
    method: "POST",
    body: JSON.stringify(options),
  });
}

export async function getSupplierReportPreview(options: SupplierReportOptions) {
  return apiRequest<{ data: SupplierReportPreview }>(`/reports/suppliers/summary?${supplierReportQuery(options)}`);
}

export async function downloadSupplierReportPdf(options: SupplierReportOptions) {
  return downloadBlob("/reports/suppliers/pdf", options, `clinicfeed-supplier-report-${options.fromDate}-${options.toDate}.pdf`);
}

export async function downloadSupplierReportExcel(options: SupplierReportOptions) {
  return downloadBlob("/reports/suppliers/excel", options, `clinicfeed-supplier-report-${options.fromDate}-${options.toDate}.xlsx`);
}
