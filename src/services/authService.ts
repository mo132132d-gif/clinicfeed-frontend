import { apiRequest, clearStoredToken, setStoredToken } from "./api";
import { unwrapData } from "../lib/format";
import type { User } from "../types";

export async function login(email: string, password: string) {
  const payload = await apiRequest<{ data?: { token: string; user: User }; token?: string; user?: User }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const data = unwrapData<{ token: string; user: User }>(payload);
  if (!data?.token) throw new Error("لم يرجع الخادم رمز الدخول");
  setStoredToken(data.token);
  return data;
}

export async function getMe() {
  const payload = await apiRequest<{ data: User }>("/auth/me");
  return unwrapData<User>(payload);
}

export async function updateMyAccount(data: Pick<User, "name" | "email" | "phone">) {
  const payload = await apiRequest<{ data: User }>("/account", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return unwrapData<User>(payload);
}

export async function changeMyPassword(current_password: string, new_password: string) {
  return apiRequest<{ data: { success: boolean } }>("/account/password", {
    method: "PATCH",
    body: JSON.stringify({ current_password, new_password }),
  });
}

export function logout() {
  clearStoredToken();
}
