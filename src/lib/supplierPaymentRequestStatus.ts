export const supplierPaymentRequestStatuses = [
  { value: "New", label: "جديد" },
  { value: "Under Review", label: "تحت المراجعة" },
  { value: "Waiting Invoice", label: "بانتظار الفاتورة" },
  { value: "Waiting Approval", label: "بانتظار الاعتماد" },
  { value: "Approved", label: "معتمد" },
  { value: "Paid", label: "تم السداد" },
  { value: "Rejected", label: "مرفوض" },
  { value: "Cancelled", label: "ملغي" },
] as const;

export const supplierPaymentRequestPriorities = [
  { value: "Low", label: "منخفضة" },
  { value: "Normal", label: "عادية" },
  { value: "High", label: "عالية" },
  { value: "Urgent", label: "عاجلة" },
] as const;

export const supplierPaymentDocumentTypes = [
  "Supplier Invoice",
  "Quotation",
  "Payment Receipt",
  "Bank Transfer",
  "Other",
] as const;

export type SupplierPaymentRequestStatus = (typeof supplierPaymentRequestStatuses)[number]["value"];
export type SupplierPaymentRequestPriority = (typeof supplierPaymentRequestPriorities)[number]["value"];
export type SupplierPaymentDocumentType = (typeof supplierPaymentDocumentTypes)[number];

export function supplierPaymentRequestStatusLabel(status?: string | null) {
  return supplierPaymentRequestStatuses.find((item) => item.value === status)?.label || status || "-";
}

export function supplierPaymentRequestPriorityLabel(priority?: string | null) {
  return supplierPaymentRequestPriorities.find((item) => item.value === priority)?.label || priority || "-";
}

export function supplierPaymentDocumentTypeLabel(type?: string | null) {
  const labels: Record<string, string> = {
    "Supplier Invoice": "فاتورة مورد",
    Quotation: "عرض سعر",
    "Payment Receipt": "إيصال سداد",
    "Bank Transfer": "تحويل بنكي",
    Other: "أخرى",
  };

  return labels[type || ""] || type || "-";
}

export function supplierPaymentRequestStatusClass(status?: string | null) {
  if (status === "Paid") return "border-emerald-500/30 bg-emerald-500/15 text-emerald-200";
  if (status === "Approved") return "border-blue-500/30 bg-blue-500/15 text-blue-100";
  if (status === "Rejected" || status === "Cancelled") return "border-rose-500/30 bg-rose-500/15 text-rose-200";
  if (status === "Waiting Invoice" || status === "Waiting Approval") return "border-amber-500/30 bg-amber-500/15 text-amber-100";
  return "border-slate-600 bg-slate-800 text-slate-100";
}
