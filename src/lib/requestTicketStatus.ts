export type RequestTicketStatus = "pending" | "in_progress" | "completed" | "cancelled";

const statusAliases: Record<string, RequestTicketStatus> = {
  pending: "pending",
  new: "pending",
  under_review: "pending",
  waiting_customer: "pending",
  waiting_supplier: "pending",
  quotation_sent: "pending",
  active: "pending",
  معلق: "pending",
  pending_status: "pending",
  in_progress: "in_progress",
  "in progress": "in_progress",
  قيد_التنفيذ: "in_progress",
  "قيد التنفيذ": "in_progress",
  completed: "completed",
  complete: "completed",
  executed: "completed",
  منفذ: "completed",
  منفذة: "completed",
  cancelled: "cancelled",
  canceled: "cancelled",
  cancelled_status: "cancelled",
  canceled_status: "cancelled",
  ملغي: "cancelled",
  ملغية: "cancelled",
};

const statusMeta: Record<RequestTicketStatus, { label: string; className: string }> = {
  pending: {
    label: "معلق",
    className: "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-200",
  },
  in_progress: {
    label: "قيد التنفيذ",
    className: "border-blue-500/30 bg-blue-500/15 text-blue-700 dark:text-blue-200",
  },
  completed: {
    label: "منفذ",
    className: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-200",
  },
  cancelled: {
    label: "ملغي",
    className: "border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-200",
  },
};

export const requestTicketStatusOptions = (Object.keys(statusMeta) as RequestTicketStatus[]).map((value) => ({
  value,
  ...statusMeta[value],
}));

export function normalizeRequestTicketStatus(status?: string | null): RequestTicketStatus {
  const key = String(status || "pending").trim().toLowerCase();
  return statusAliases[key] || "pending";
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
