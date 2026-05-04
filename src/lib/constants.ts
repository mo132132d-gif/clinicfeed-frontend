import type { ContractStatus, DocumentType, Role, SupplierStatus } from "../types";

export const TOKEN_KEY = "clinicfeed_token";
export const LEGACY_TOKEN_KEYS = ["token", "authToken"];
export const THEME_KEY = "clinicfeed_theme";

export const supplierStatuses: Array<{ value: SupplierStatus; label: string }> = [
  { value: "Active", label: "نشط" },
  { value: "Pending", label: "قيد المراجعة" },
  { value: "Suspended", label: "موقوف" },
  { value: "Inactive", label: "غير نشط" },
  { value: "Blacklisted", label: "قائمة سوداء" },
];

export const contractStatuses: Array<{ value: ContractStatus; label: string }> = [
  { value: "Active", label: "ساري" },
  { value: "Expired", label: "منتهي" },
  { value: "Terminated", label: "منتهي تعاقديًا" },
];

export const documentTypes: Array<{ value: DocumentType; label: string }> = [
  { value: "CR", label: "السجل التجاري" },
  { value: "VAT", label: "شهادة ضريبة القيمة المضافة" },
  { value: "Authorization", label: "خطاب تفويض" },
  { value: "Catalog", label: "كتالوج المنتجات" },
  { value: "Price List", label: "قائمة الأسعار" },
  { value: "Other", label: "أخرى" },
];

export const roleLabels: Record<Role, string> = {
  admin: "مدير النظام",
  manager: "مدير",
  operations: "العمليات",
  sales: "المبيعات",
  viewer: "مشاهدة فقط",
};

export const departments = [
  "إدارة الموردين",
  "العقود والمستندات",
  "المتابعة والتواصل",
  "المبيعات",
  "الإدارة",
  "مشاهدة فقط",
];

export const categoryOptions = [
  "أجهزة طبية",
  "مستلزمات طبية",
  "أدوية",
  "مختبرات",
  "أسنان",
  "تجميل وجلدية",
  "أدوات جراحية",
  "صيانة وقطع غيار",
  "تدريب وخدمات",
  "أخرى",
];

export const allowedFileExtensions = ["pdf", "doc", "docx", "xls", "xlsx", "png", "jpg", "jpeg"];
export const maxFileSize = 10 * 1024 * 1024;
