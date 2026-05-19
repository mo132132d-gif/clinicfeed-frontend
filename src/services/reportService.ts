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

function reportQuery(options: DailyReportOptions) {
  const query = new URLSearchParams();
  if (options.date) query.set("date", options.date);
  if (options.sections.length > 0) query.set("sections", options.sections.join(","));
  return query.toString();
}

export async function downloadDailyReportPdf(options: DailyReportOptions) {
  if (!API_URL) {
    throw new ApiError("رابط الخادم غير مهيأ للبيئة الحالية", 0);
  }

  const headers = new Headers();
  const token = getStoredToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_URL}/reports/daily/pdf?${reportQuery(options)}`, { headers });
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
