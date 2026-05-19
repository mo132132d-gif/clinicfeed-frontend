export type Role = 'admin' | 'manager' | 'operations' | 'sales' | 'viewer';

export function isAdmin(role?: Role) {
  return role === 'admin';
}

export function canManageUsers(role?: Role) {
  return role === 'admin';
}

export function canExportDailyReports(role?: Role) {
  return role === 'admin' || role === 'manager';
}

export function canManageSuppliers(role?: Role) {
  return role === 'admin' || role === 'manager' || role === 'operations';
}

export function canManageSupplierPaymentRequests(role?: Role) {
  return role === 'admin' || role === 'manager' || role === 'operations';
}

export function canCreateSupplier(role?: Role) {
  return role === 'admin' || role === 'manager' || role === 'operations';
}

export function canArchiveSuppliers(role?: Role) {
  return role === 'admin' || role === 'manager' || role === 'operations';
}

export function canArchiveSupplier(role?: Role) {
  return canArchiveSuppliers(role);
}

export function canUploadFiles(role?: Role) {
  return role === 'admin' || role === 'manager' || role === 'operations';
}

export function canEditPerformance(role?: Role) {
  return role === 'admin' || role === 'manager' || role === 'operations';
}

export function canViewSuppliers(role?: Role) {
  return role === 'admin' || role === 'manager' || role === 'operations' || role === 'sales' || role === 'viewer';
}
