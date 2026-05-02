import { LEGACY_TOKEN_KEYS, TOKEN_KEY } from "../lib/constants";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) || LEGACY_TOKEN_KEYS.map((key) => localStorage.getItem(key)).find(Boolean) || "";
}

export function setStoredToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem("token", token);
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
  for (const key of LEGACY_TOKEN_KEYS) localStorage.removeItem(key);
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
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
    throw new ApiError("تعذر الاتصال بالخادم", 0);
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

  if (response.status === 401) {
    clearStoredToken();
    window.dispatchEvent(new CustomEvent("clinicfeed:unauthorized"));
    throw new ApiError("انتهت الجلسة، الرجاء تسجيل الدخول مرة أخرى", 401);
  }

  if (!response.ok) {
    const errorPayload = payload as { error?: { message?: string }; message?: string };
    throw new ApiError(errorPayload?.error?.message || errorPayload?.message || "فشل تنفيذ العملية", response.status);
  }

  return payload as T;
}
