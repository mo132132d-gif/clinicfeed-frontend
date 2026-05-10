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
    className: "border-slate-400/40 bg-slate-100 text-slate-700",
  },
  under_review: {
    label: "قيد المراجعة",
    className: "border-blue-500/30 bg-blue-500/10 text-blue-700",
  },
  waiting_customer: {
    label: "بانتظار العميل",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-700",
  },
  waiting_supplier: {
    label: "بانتظار المورد",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-700",
  },
  quotation_sent: {
    label: "تم إرسال عرض سعر",
    className: "border-sky-500/30 bg-sky-500/10 text-sky-700",
  },
  in_progress: {
    label: "قيد المعالجة",
    className: "border-blue-500/30 bg-blue-500/10 text-blue-700",
  },
  completed: {
    label: "منفذ",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
  },
  cancelled: {
    label: "ملغي",
    className: "border-rose-500/30 bg-rose-500/10 text-rose-700",
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
