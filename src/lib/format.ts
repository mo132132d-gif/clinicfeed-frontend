import { documentTypes, supplierStatuses } from "./constants";

export function normalizeList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const data = (payload as Record<string, unknown>).data;
    if (Array.isArray(data)) return data as T[];
    for (const key of ["suppliers", "contacts", "contracts", "documents", "users", "logs"]) {
      const value = (payload as Record<string, unknown>)[key];
      if (Array.isArray(value)) return value as T[];
    }
  }
  return [];
}

export function unwrapData<T>(payload: unknown): T | null {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

export function formatDate(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toISOString().slice(0, 10);
}

export function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return `${parsed.toISOString().slice(0, 10)} ${parsed.toISOString().slice(11, 16)}`;
}

export function formatNumber(value?: number | string | null) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed.toLocaleString("ar-SA") : "0";
}

export function formatCurrency(value?: number | string | null) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed)) return "0";
  return parsed.toLocaleString("ar-SA", { maximumFractionDigits: 2 });
}

export function parseCategories(value?: string | string[] | null) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function serializeCategories(value: string[]) {
  return parseCategories(value).join(",");
}

export function supplierStatusLabel(status?: string | null) {
  return supplierStatuses.find((item) => item.value === status)?.label || status || "-";
}

export function documentTypeLabel(type?: string | null) {
  return documentTypes.find((item) => item.value === type)?.label || type || "-";
}

export function expiryState(dateValue?: string | null) {
  if (!dateValue) return { label: "غير محدد", tone: "muted" as const };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(`${formatDate(dateValue)}T00:00:00`);
  const days = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: "منتهي", tone: "danger" as const };
  if (days <= 30) return { label: "قريب الانتهاء", tone: "warning" as const };
  return { label: "ساري", tone: "success" as const };
}

export function percentage(numerator?: number | string | null, denominator?: number | string | null) {
  const n = Number(numerator || 0);
  const d = Number(denominator || 0);
  if (!Number.isFinite(n) || !Number.isFinite(d) || d <= 0) return null;
  return (n / d) * 100;
}

export function serviceScoreLabel(score: number | null) {
  if (score === null || !Number.isFinite(score)) return "غير محسوب";
  if (score >= 4.5) return "ممتاز";
  if (score >= 3.5) return "جيد";
  if (score >= 2.5) return "يحتاج متابعة";
  return "عالي المخاطر";
}
