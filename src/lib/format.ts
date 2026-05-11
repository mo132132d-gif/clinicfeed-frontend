import { documentTypes, supplierStatuses } from "./constants";

export function normalizeList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];

  if (!payload || typeof payload !== "object") return [];

  const root = payload as Record<string, unknown>;

  const listKeys = [
    "suppliers",
    "contacts",
    "contracts",
    "documents",
    "users",
    "logs",
    "activity_logs",
    "items",
    "rows",
    "results",
  ];

  for (const key of listKeys) {
    const value = root[key];
    if (Array.isArray(value)) return value as T[];
  }

  const data = root.data;

  if (Array.isArray(data)) return data as T[];

  if (data && typeof data === "object") {
    const dataObject = data as Record<string, unknown>;

    for (const key of listKeys) {
      const value = dataObject[key];
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

export function normalizeArabicDateLabel(value?: string | number | null) {
  return String(value ?? "")
    .replace(/رهش/g, "شهر")
    .replace(/ةنس/g, "سنة")
    .replace(/موي/g, "يوم")
    .replace(/عوبسأ/g, "أسبوع");
}

export function formatNumber(value?: number | string | null) {
  if (value === undefined || value === null || value === "") return "-";
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed.toLocaleString("ar-SA") : "-";
}

export function formatCurrency(value?: number | string | null) {
  const parsed = Number(value || 0);

  if (!Number.isFinite(parsed)) return "0 ريال";

  return `${parsed.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ريال`;
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
  if (days <= 30) return { label: "ينتهي قريبًا", tone: "warning" as const };

  return { label: "ساري", tone: "success" as const };
}

export function percentage(numerator?: number | string | null, denominator?: number | string | null) {
  const n = Number(numerator || 0);
  const d = Number(denominator || 0);

  if (!Number.isFinite(n) || !Number.isFinite(d) || d <= 0) return null;

  return (n / d) * 100;
}

export function safePercent(numerator?: number | string | null, denominator?: number | string | null) {
  return percentage(numerator, denominator);
}

export function safeAverage(numbers: Array<number | string | null | undefined>) {
  const values = numbers.map(Number).filter((value) => Number.isFinite(value));
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function formatPercent(value?: number | string | null, maximumFractionDigits = 0) {
  if (value === undefined || value === null || value === "") return "-";
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "-";
  return `${parsed.toLocaleString("ar-SA", { maximumFractionDigits })}%`;
}

export function formatDurationHours(hours?: number | string | null) {
  if (hours === undefined || hours === null || hours === "") return "-";
  const parsed = Number(hours);
  if (!Number.isFinite(parsed)) return "-";
  if (parsed < 1) return "أقل من ساعة";
  if (parsed < 24) return `${Math.round(parsed).toLocaleString("ar-SA")} ساعة`;
  const days = Math.floor(parsed / 24);
  const remainingHours = Math.round(parsed % 24);
  return normalizeArabicDateLabel(
    remainingHours ? `${days.toLocaleString("ar-SA")} يوم و ${remainingHours.toLocaleString("ar-SA")} ساعة` : `${days.toLocaleString("ar-SA")} يوم`
  );
}

export function serviceScoreLabel(score: number | null) {
  if (score === null || !Number.isFinite(score)) return "غير محسوب";
  if (score >= 4.5) return "ممتاز";
  if (score >= 3.5) return "جيد";
  if (score >= 2.5) return "يحتاج متابعة";

  return "عالي المخاطر";
}
