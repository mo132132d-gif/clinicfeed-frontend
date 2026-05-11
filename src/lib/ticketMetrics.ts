import type { RequestTicket } from "../types";
import { normalizeArabicDateLabel } from "./format";
import { normalizeRequestTicketStatus } from "./requestTicketStatus";

const hourMs = 60 * 60 * 1000;
const dayMs = 24 * hourMs;

export function calculateVatAmount(baseAmount: number, vatPercent: number) {
  if (!Number.isFinite(baseAmount) || !Number.isFinite(vatPercent)) return 0;
  return Math.max(0, baseAmount) * Math.max(0, vatPercent) / 100;
}

export function ticketClosedAt(ticket: RequestTicket) {
  return ticket.closed_at || ticket.updated_at || ticket.created_at || null;
}

export function isClosedTicket(ticket: RequestTicket) {
  const status = normalizeRequestTicketStatus(ticket.status);
  return status === "completed" || status === "cancelled";
}

export function ticketCycleMs(ticket: RequestTicket, now = new Date()) {
  if (!ticket.created_at) return null;
  const start = new Date(ticket.created_at);
  if (Number.isNaN(start.getTime())) return null;
  const endSource = isClosedTicket(ticket) ? ticketClosedAt(ticket) : null;
  const end = endSource ? new Date(endSource) : now;
  if (Number.isNaN(end.getTime()) || end < start) return null;
  return end.getTime() - start.getTime();
}

export function formatDuration(ms?: number | null) {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return "-";
  const days = Math.floor(ms / dayMs);
  const hours = Math.floor((ms % dayMs) / hourMs);
  if (days > 0 && hours > 0) return normalizeArabicDateLabel(`${days} يوم و ${hours} ساعة`);
  if (days > 0) return normalizeArabicDateLabel(`${days} يوم`);
  if (hours > 0) return normalizeArabicDateLabel(`${hours} ساعة`);
  return "أقل من ساعة";
}

export function averageCompletedCycleMs(tickets: RequestTicket[]) {
  const durations = tickets
    .filter((ticket) => normalizeRequestTicketStatus(ticket.status) === "completed")
    .map((ticket) => ticketCycleMs(ticket))
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (!durations.length) return null;
  return durations.reduce((sum, value) => sum + value, 0) / durations.length;
}

export function ticketDelayLevel(ticket: RequestTicket, now = new Date()) {
  if (isClosedTicket(ticket)) return null;
  const elapsed = ticketCycleMs(ticket, now);
  if (elapsed === null) return null;
  if (elapsed > 48 * hourMs) return "high";
  if (elapsed > 24 * hourMs) return "warning";
  return null;
}

export function ticketDelayLabel(ticket: RequestTicket) {
  const level = ticketDelayLevel(ticket);
  if (level === "high") return "تأخير عالي";
  if (level === "warning") return "الطلب متأخر";
  return "";
}
