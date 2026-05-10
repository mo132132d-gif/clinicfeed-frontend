import { LEGACY_TOKEN_KEYS, TOKEN_KEY } from "../lib/constants";

const configuredApiUrl = import.meta.env.VITE_API_URL;
export const API_URL = configuredApiUrl || (import.meta.env.DEV ? "http://localhost:4000/api" : "");

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function mapApiErrorMessage(status: number, fallback = "", path = "") {
  const lower = fallback.toLowerCase();

  if (path.includes("/auth/login") && status === 401) return "اسم المستخدم أو كلمة المرور غير صحيحة";
  if (status === 401 && (lower.includes("invalid") || lower.includes("credentials") || lower.includes("password"))) {
    return "اسم المستخدم أو كلمة المرور غير صحيحة";
  }
  if (status === 401) return "انتهت الجلسة أو يلزم تسجيل الدخول";
  if (status === 403 || lower.includes("permission") || lower.includes("forbidden")) return "ليست لديك صلاحية لتنفيذ هذا الإجراء";
  if (status === 404 || lower.includes("route not found") || lower.includes("not found")) return "الميزة المطلوبة غير متاحة أو مسار الخدمة غير موجود";
  if (status >= 500) return "حدث خطأ في الخادم، حاول مرة أخرى لاحقًا";
  if (status === 0) return "تعذر الاتصال بالخادم";

  return fallback || "تعذر تنفيذ العملية";
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) || LEGACY_TOKEN_KEYS.map((key) => localStorage.getItem(key)).find(Boolean) || "";
}

export function setStoredToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
  for (const key of LEGACY_TOKEN_KEYS) localStorage.removeItem(key);
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
  for (const key of LEGACY_TOKEN_KEYS) localStorage.removeItem(key);
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!API_URL) {
    throw new ApiError("رابط الخادم غير مهيأ للبيئة الحالية", 0);
  }

  const token = getStoredToken();
  const isFormData = options.body instanceof FormData;
  const headers = new Headers(options.headers);

  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(mapApiErrorMessage(0), 0);
  }

  const text = await response.text();
  let payload: unknown = {};
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = {};
    }
  }

  if (response.status === 401 && !path.includes("/auth/login")) {
    clearStoredToken();
    window.dispatchEvent(new CustomEvent("clinicfeed:unauthorized"));
  }

  if (!response.ok) {
    const errorPayload = payload as { error?: { message?: string }; message?: string };
    const backendMessage = errorPayload?.error?.message || errorPayload?.message || "";
    throw new ApiError(mapApiErrorMessage(response.status, backendMessage, path), response.status);
  }

  return payload as T;
}
