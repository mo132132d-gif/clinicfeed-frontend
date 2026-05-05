export type Role = "admin" | "manager" | "operations" | "sales" | "viewer";

export type SupplierStatus = "Active" | "Pending" | "Suspended" | "Inactive" | "Blacklisted";
export type ContractStatus = "Active" | "Expired" | "Terminated";
export type DocumentType = "CR" | "VAT" | "Authorization" | "Catalog" | "Price List" | "Other";

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: Role;
  department_or_task?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  last_login_at?: string | null;
}

export interface Supplier {
  id: string;
  name_ar: string;
  name_en?: string | null;
  name?: string | null;
  phone?: string | null;
  mobile?: string | null;
  email?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  cr_number?: string | null;
  vat_number?: string | null;
  city?: string | null;
  category?: string | null;
  status: SupplierStatus;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Contact {
  id: string;
  supplier_id: string;
  name: string;
  position?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  is_primary: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Contract {
  id: string;
  supplier_id: string;
  contract_number: string;
  contract_type?: string | null;
  start_date: string;
  end_date: string;
  status: ContractStatus;
  file_url?: string | null;
  owner?: string | null;
  notes?: string | null;
  file_name?: string | null;
  file_mime_type?: string | null;
  file_size?: number | null;
  file_path?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SupplierDocument {
  id: string;
  supplier_id: string;
  type: DocumentType;
  file_url?: string | null;
  expiry_date?: string | null;
  last_updated?: string | null;
  file_name?: string | null;
  file_mime_type?: string | null;
  file_size?: number | null;
  file_path?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ActivityLog {
  id: string;
  user_id?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  old_value?: Record<string, unknown> | null;
  new_value?: Record<string, unknown> | null;
  created_at?: string;
}

export interface SupplierPerformance {
  id?: string;
  supplier_id?: string;
  total_orders?: number | string | null;
  fulfilled_orders?: number | string | null;
  cancelled_orders?: number | string | null;
  total_order_value?: number | string | null;
  supplier_revenue?: number | string | null;
  supplier_balance?: number | string | null;
  average_response_time?: number | string | null;
  last_order_date?: string | null;
  last_contact_date?: string | null;
  last_price_list_update?: string | null;
  price_accuracy_score?: number | string | null;
  product_availability_score?: number | string | null;
  delivery_commitment_score?: number | string | null;
  response_speed_score?: number | string | null;
  service_notes?: string | null;
  supplier_name_ar?: string;
  supplier_name_en?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ApiList<T> {
  data: T[];
  meta?: {
    total?: number;
    limit?: number;
    offset?: number;
  };
}

export interface RequestTicket {
  id: string;
  ticket_number: string;
  customer_name: string;
  phone?: string | null;
  email?: string | null;
  country?: string | null;
  region?: string | null;
  request_description?: string | null;
  assigned_to?: string | null;
  status:
    | "جديد"
    | "قيد المراجعة"
    | "بأنتظار العميل"
    | "بأنتظار المورد"
    | "تم ارسال عرض سعر"
    | "قيد التنفيذ"
    | "منفذة"
    | "ملغية";
  priority?: string | null;
  source?: string | null;
  internal_notes?: string | null;
  cancellation_reason?: string | null;
  supplier_ids?: string[];
  suppliers?: Supplier[];
  linked_suppliers?: Supplier[];
  order_amount?: number | string | null;
  vat_amount?: number | string | null;
  total_amount?: number | string | null;
  qr_code?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  closed_at?: string | null;
}

export interface RequestTicketsSummary {
  total_requests?: number | string | null;
  total_tickets?: number | string | null;
  total?: number | string | null;
  executed_requests?: number | string | null;
  completed_requests?: number | string | null;
  completed?: number | string | null;
  cancelled_requests?: number | string | null;
  cancelled?: number | string | null;
  pending_requests?: number | string | null;
  pending?: number | string | null;
  order_amount_sum?: number | string | null;
  total_order_amount?: number | string | null;
  vat_amount_sum?: number | string | null;
  total_vat_amount?: number | string | null;
  total_amount_sum?: number | string | null;
  grand_total_amount?: number | string | null;
  average_order_value?: number | string | null;
  avg_order_value?: number | string | null;
  max_order_value?: number | string | null;
  highest_order_value?: number | string | null;
  tickets_without_supplier?: number | string | null;
  requests_without_supplier?: number | string | null;
  tickets_with_suppliers?: number | string | null;
  requests_with_suppliers?: number | string | null;
}
