export type RequestTicketStatus =
  | "new"
  | "under_review"
  | "waiting_customer"
  | "waiting_supplier"
  | "quotation_sent"
  | "in_progress"
  | "completed"
  | "cancelled";

const statusAliases: Record<string, RequestTicketStatus> = {
  new: "new",
  pending: "new",
  active: "new",
  "جديد": "new",
  "معلق": "new",

  under_review: "under_review",
  "قيد المراجعة": "under_review",

  waiting_customer: "waiting_customer",
  "بأنتظار العميل": "waiting_customer",
  "بانتظار العميل": "waiting_customer",
  "بإنتظار العميل": "waiting_customer",

  waiting_supplier: "waiting_supplier",
  "بأنتظار المورد": "waiting_supplier",
  "بانتظار المورد": "waiting_supplier",
  "بإنتظار المورد": "waiting_supplier",

  quotation_sent: "quotation_sent",
  "تم ارسال عرض سعر": "quotation_sent",
  "تم إرسال عرض سعر": "quotation_sent",

  in_progress: "in_progress",
  "in progress": "in_progress",
  "قيد التنفيذ": "in_progress",
  "قيد_التنفيذ": "in_progress",

  completed: "completed",
  complete: "completed",
  executed: "completed",
  "منفذة": "completed",
  "منفذ": "completed",
  "مكتمل": "completed",
  "تم التنفيذ": "completed",

  cancelled: "cancelled",
  canceled: "cancelled",
  "ملغية": "cancelled",
  "ملغي": "cancelled",
  "ملغى": "cancelled",
};

const statusMeta: Record<RequestTicketStatus, { label: string; className: string }> = {
  new: {
    label: "جديد",
    className: "border-slate-500/30 bg-slate-500/15 text-slate-700 dark:text-slate-200",
  },
  under_review: {
    label: "قيد المراجعة",
    className: "border-purple-500/30 bg-purple-500/15 text-purple-700 dark:text-purple-200",
  },
  waiting_customer: {
    label: "بأنتظار العميل",
    className: "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-200",
  },
  waiting_supplier: {
    label: "بأنتظار المورد",
    className: "border-orange-500/30 bg-orange-500/15 text-orange-700 dark:text-orange-200",
  },
  quotation_sent: {
    label: "تم ارسال عرض سعر",
    className: "border-sky-500/30 bg-sky-500/15 text-sky-700 dark:text-sky-200",
  },
  in_progress: {
    label: "قيد التنفيذ",
    className: "border-blue-500/30 bg-blue-500/15 text-blue-700 dark:text-blue-200",
  },
  completed: {
    label: "منفذة",
    className: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-200",
  },
  cancelled: {
    label: "ملغية",
    className: "border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-200",
  },
};

export const requestTicketStatusOptions = (Object.keys(statusMeta) as RequestTicketStatus[]).map((value) => ({
  value,
  ...statusMeta[value],
}));

export function normalizeRequestTicketStatus(status?: string | null): RequestTicketStatus {
  const key = String(status || "new").trim().toLowerCase();
  return statusAliases[key] || "new";
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
