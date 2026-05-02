import type { Role } from "../types";

export function canManageUsers(role?: Role) {
  return role === "admin";
}

export function canManageSuppliers(role?: Role) {
  return role === "admin" || role === "operations";
}

export function canArchiveSuppliers(role?: Role) {
  return role === "admin";
}

export function canUploadFiles(role?: Role) {
  return role === "admin" || role === "operations";
}

export function canEditPerformance(role?: Role) {
  return role === "admin" || role === "operations";
}

export function canCreateSupplier(role?: Role) {
  return role === "admin" || role === "operations";
}
