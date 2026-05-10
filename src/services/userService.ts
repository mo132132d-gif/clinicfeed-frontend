import { apiRequest } from "./api";
import { normalizeList, unwrapData } from "../lib/format";
import { normalizeSaudiMobileNumber } from "../lib/phone";
import type { Role, User } from "../types";

export interface UserFormPayload {
  name: string;
  email?: string;
  password?: string;
  role: Role;
  is_active: boolean;
  department_or_task?: string | null;
  phone?: string | null;
}

function normalizeUserPayload(data: Partial<UserFormPayload>) {
  return {
    ...data,
    phone: data.phone ? normalizeSaudiMobileNumber(data.phone) : data.phone,
  };
}

export async function listUsers(search = "") {
  const query = search ? `?q=${encodeURIComponent(search)}&limit=100` : "?limit=100";
  const payload = await apiRequest<unknown>(`/auth/users${query}`);
  return normalizeList<User>(payload);
}

export async function createUser(data: UserFormPayload) {
  const payload = await apiRequest<{ data: User }>("/auth/users", {
    method: "POST",
    body: JSON.stringify(normalizeUserPayload(data)),
  });
  return unwrapData<User>(payload);
}

export async function updateUser(id: string, data: Partial<UserFormPayload>) {
  const payload = await apiRequest<{ data: User }>(`/auth/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(normalizeUserPayload(data)),
  });
  return unwrapData<User>(payload);
}

export async function setUserStatus(id: string, is_active: boolean) {
  const payload = await apiRequest<{ data: User }>(`/auth/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ is_active }),
  });
  return unwrapData<User>(payload);
}

export async function resetUserPassword(id: string, password: string) {
  const payload = await apiRequest<{ data: User }>(`/auth/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ password }),
  });
  return unwrapData<User>(payload);
}
