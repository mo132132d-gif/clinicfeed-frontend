export type RequestTicketStatus =
  | "جديد"
  | "قيد المراجعة"
  | "بأنتظار العميل"
  | "بأنتظار المورد"
  | "تم ارسال عرض سعر"
  | "قيد التنفيذ"
  | "منفذة"
  | "ملغية";

const statusAliases: Record<string, RequestTicketStatus> = {
  "جديد": "جديد",
  pending: "جديد",
  new: "جديد",
  active: "جديد",
  معلق: "جديد",
  pending_status: "جديد",
  "قيد المراجعة": "قيد المراجعة",
  under_review: "قيد المراجعة",
  "بأنتظار العميل": "بأنتظار العميل",
  "بانتظار العميل": "بأنتظار العميل",
  waiting_customer: "بأنتظار العميل",
  "بأنتظار المورد": "بأنتظار المورد",
  "بانتظار المورد": "بأنتظار المورد",
  waiting_supplier: "بأنتظار المورد",
  "تم ارسال عرض سعر": "تم ارسال عرض سعر",
  "تم إرسال عرض سعر": "تم ارسال عرض سعر",
  quotation_sent: "تم ارسال عرض سعر",
  "قيد التنفيذ": "قيد التنفيذ",
  قيد_التنفيذ: "قيد التنفيذ",
  in_progress: "قيد التنفيذ",
  "in progress": "قيد التنفيذ",
  منفذة: "منفذة",
  منفذ: "منفذة",
  completed: "منفذة",
  complete: "منفذة",
  executed: "منفذة",
  ملغية: "ملغية",
  ملغي: "ملغية",
  cancelled: "ملغية",
  canceled: "ملغية",
  cancelled_status: "ملغية",
  canceled_status: "ملغية",
};

const statusMeta: Record<RequestTicketStatus, { label: string; className: string }> = {
  جديد: {
    label: "جديد",
    className: "border-slate-500/30 bg-slate-500/15 text-slate-700 dark:text-slate-200",
  },
  "قيد المراجعة": {
    label: "قيد المراجعة",
    className: "border-purple-500/30 bg-purple-500/15 text-purple-700 dark:text-purple-200",
  },
  "بأنتظار العميل": {
    label: "بأنتظار العميل",
    className: "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-200",
  },
  "بأنتظار المورد": {
    label: "بأنتظار المورد",
    className: "border-orange-500/30 bg-orange-500/15 text-orange-700 dark:text-orange-200",
  },
  "تم ارسال عرض سعر": {
    label: "تم ارسال عرض سعر",
    className: "border-sky-500/30 bg-sky-500/15 text-sky-700 dark:text-sky-200",
  },
  "قيد التنفيذ": {
    label: "قيد التنفيذ",
    className: "border-blue-500/30 bg-blue-500/15 text-blue-700 dark:text-blue-200",
  },
  منفذة: {
    label: "منفذة",
    className: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-200",
  },
  ملغية: {
    label: "ملغية",
    className: "border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-200",
  },
};

export const requestTicketStatusOptions = (Object.keys(statusMeta) as RequestTicketStatus[]).map((value) => ({
  value,
  ...statusMeta[value],
}));

export function normalizeRequestTicketStatus(status?: string | null): RequestTicketStatus {
  const key = String(status || "جديد").trim().toLowerCase();
  return statusAliases[key] || "جديد";
}

export function requestTicketStatusLabel(status?: string | null) {
  return statusMeta[normalizeRequestTicketStatus(status)].label;
}

export function requestTicketStatusBadgeClass(status?: string | null) {
  return statusMeta[normalizeRequestTicketStatus(status)].className;
}

export function requestTicketStatusMeta(status?: string | null) {
  const normalized = normalizeRequestTicketStatus(status);
  return {
    value: normalized,
    ...statusMeta[normalized],
  };
}
