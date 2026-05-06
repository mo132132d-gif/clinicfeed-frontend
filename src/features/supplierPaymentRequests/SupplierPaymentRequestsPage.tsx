import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Download,
  Edit2,
  Eye,
  FileText,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { API_URL } from "../../services/api";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { formatCurrency, formatDate, formatDateTime, formatNumber } from "../../lib/format";
import { canManageSupplierPaymentRequests } from "../../lib/permissions";
import {
  supplierPaymentDocumentTypeLabel,
  supplierPaymentDocumentTypes,
  supplierPaymentRequestPriorities,
  supplierPaymentRequestPriorityLabel,
  supplierPaymentRequestStatusClass,
  supplierPaymentRequestStatusLabel,
  supplierPaymentRequestStatuses,
  type SupplierPaymentDocumentType,
} from "../../lib/supplierPaymentRequestStatus";
import { listSuppliers } from "../../services/supplierService";
import {
  createSupplierPaymentRequest,
  deleteSupplierPaymentRequest,
  deleteSupplierPaymentRequestDocument,
  getSupplierPaymentRequest,
  listSupplierPaymentRequests,
  updateSupplierPaymentRequest,
  uploadSupplierPaymentRequestDocument,
  type SupplierPaymentRequestParams,
} from "../../services/supplierPaymentRequestService";
import type {
  Supplier,
  SupplierPaymentRequest,
  SupplierPaymentRequestDocument,
  SupplierPaymentRequestSummary,
  SupplierPaymentRequestSupplier,
} from "../../types";
import { useAuth } from "../auth/AuthProvider";
import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  LoadingState,
  Modal,
  Select,
  Textarea,
} from "../../components/shared/Primitives";

const pageSize = 25;
const statusOptionClassName = "bg-slate-950 text-slate-100 checked:bg-blue-700 checked:text-white";
const supplierRequiredMessage = "اختر المورد أولاً.";

function emptyForm(): Partial<SupplierPaymentRequest> {
  return {
    supplier_id: null,
    supplier_ids: [],
    amount: "",
    status: "New",
    priority: "Normal",
    due_date: "",
    payment_method: "",
    invoice_number: "",
    reference_number: "",
    assigned_to: "",
    notes: "",
  };
}

function numberValue(value?: number | string | null) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function summaryValue(summary: SupplierPaymentRequestSummary | undefined, key: keyof SupplierPaymentRequestSummary) {
  const value = summary?.[key];
  return value === undefined || value === null || value === "" ? 0 : value;
}

function supplierName(supplier?: Partial<Supplier> | SupplierPaymentRequestSupplier | null) {
  if (!supplier) return "-";
  return supplier.name_ar || supplier.name_en || supplier.name || "-";
}

function supplierPhone(supplier?: Partial<Supplier> | SupplierPaymentRequestSupplier | null) {
  if (!supplier) return "-";
  const phones = "phones" in supplier && Array.isArray(supplier.phones) ? supplier.phones : [];
  return phones[0] || supplier.phone || supplier.mobile || supplier.contact_phone || "-";
}

function supplierEmail(supplier?: Partial<Supplier> | SupplierPaymentRequestSupplier | null) {
  if (!supplier) return "-";
  const emails = "emails" in supplier && Array.isArray(supplier.emails) ? supplier.emails : [];
  return emails[0] || supplier.email || supplier.contact_email || "-";
}

function supplierMeta(supplier?: Partial<Supplier> | SupplierPaymentRequestSupplier | null) {
  return [supplierPhone(supplier), supplierEmail(supplier), supplier?.city, supplier?.category]
    .filter((value) => value && value !== "-")
    .join(" | ") || "-";
}

function requestSupplierName(request: SupplierPaymentRequest) {
  const suppliers = request.suppliers || [];
  if (suppliers.length === 0) return "-";
  return suppliers.map((supplier) => supplierName(supplier)).join("، ");
}

function extractSupplierIds(request?: SupplierPaymentRequest | null) {
  if (!request) return [];
  if (Array.isArray(request.supplier_ids)) return request.supplier_ids.map(String);
  if (Array.isArray(request.suppliers)) return request.suppliers.map((supplier) => String(supplier.id));
  return request.supplier_id ? [String(request.supplier_id)] : [];
}

function fileHref(url?: string | null) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  const base = API_URL.replace(/\/api\/?$/, "");
  return `${base}${url.startsWith("/") ? url : `/${url}`}`;
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(rows: SupplierPaymentRequest[]) {
  const headers = [
    "request_number",
    "supplier_name",
    "amount",
    "status",
    "priority",
    "due_date",
    "invoice_number",
    "reference_number",
    "assigned_to",
    "created_at",
    "updated_at",
  ];

  const body = rows.map((request) => [
    request.request_number,
    requestSupplierName(request),
    request.amount,
    request.status,
    request.priority,
    request.due_date,
    request.invoice_number,
    request.reference_number,
    request.assigned_to,
    request.created_at,
    request.updated_at,
  ].map(csvEscape).join(","));

  const blob = new Blob([[headers.join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `supplier-payment-requests-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

function StatusBadge({ status }: { status?: string | null }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${supplierPaymentRequestStatusClass(status)}`}>
      {supplierPaymentRequestStatusLabel(status)}
    </span>
  );
}

export function SupplierPaymentRequestsPage() {
  const { user, setMessage } = useAuth();
  const queryClient = useQueryClient();
  const canManage = canManageSupplierPaymentRequests(user?.role);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [assignedTo, setAssignedTo] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<SupplierPaymentRequest | null | undefined>(undefined);
  const [detailsId, setDetailsId] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(search, 250);
  const params = useMemo<SupplierPaymentRequestParams>(() => ({
    q: debouncedSearch.trim() || undefined,
    status,
    assigned_to: assignedTo.trim() || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  }), [assignedTo, dateFrom, dateTo, debouncedSearch, page, status]);

  const requestsQuery = useQuery({
    queryKey: ["supplierPaymentRequests", params],
    queryFn: () => listSupplierPaymentRequests(params),
    staleTime: 60_000,
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const result = await listSupplierPaymentRequests({ ...params, limit: 2000, offset: 0 });
      return result.data;
    },
    onSuccess: (rows) => {
      downloadCsv(rows);
      setMessage("تم تصدير ملف CSV");
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "فشل تصدير البيانات"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSupplierPaymentRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplierPaymentRequests"] });
      setMessage("تم حذف طلب السداد");
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "فشل حذف طلب السداد"),
  });

  const rows = requestsQuery.data?.data || [];
  const total = requestsQuery.data?.meta?.total || rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const summary = requestsQuery.data?.summary;

  function confirmDelete(request: SupplierPaymentRequest) {
    if (!canManage) {
      setMessage("ليس لديك صلاحية لتنفيذ هذا الإجراء");
      return;
    }

    if (window.confirm(`هل تريد حذف طلب السداد ${request.request_number}؟`)) {
      deleteMutation.mutate(request.id);
    }
  }

  return (
    <div className="space-y-6">
      {editing !== undefined && (
        <SupplierPaymentRequestModal
          request={editing}
          onOpenDetails={setDetailsId}
          onClose={() => setEditing(undefined)}
        />
      )}

      {detailsId && (
        <SupplierPaymentRequestDetailsModal
          requestId={detailsId}
          canManage={canManage}
          onClose={() => setDetailsId(null)}
        />
      )}

      <Card className="p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">سداد الموردين</h1>
            <p className="mt-1 text-sm text-slate-400">متابعة طلبات سداد الموردين، المستندات، وحالة الاعتماد والسداد.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => queryClient.invalidateQueries({ queryKey: ["supplierPaymentRequests"] })}>
              <RefreshCw className="h-4 w-4" />
              تحديث
            </Button>
            <Button variant="secondary" onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending}>
              <Download className="h-4 w-4" />
              {exportMutation.isPending ? "جاري التصدير..." : "Export CSV"}
            </Button>
            {canManage && (
              <Button onClick={() => setEditing(null)}>
                <Plus className="h-4 w-4" />
                طلب جديد
              </Button>
            )}
          </div>
        </div>
      </Card>

      <SummaryCards summary={summary} />

      <Card className="p-5">
        <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_0.9fr_0.9fr]">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              className="pr-9"
              placeholder="بحث بالمورد أو رقم الطلب أو الفاتورة"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>

          <Select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option className={statusOptionClassName} value="all">كل الحالات</option>
            {supplierPaymentRequestStatuses.map((item) => (
              <option className={statusOptionClassName} key={item.value} value={item.value}>{item.label}</option>
            ))}
          </Select>

          <Input
            placeholder="المسؤول"
            value={assignedTo}
            onChange={(event) => {
              setAssignedTo(event.target.value);
              setPage(1);
            }}
          />

          <Input
            type="date"
            value={dateFrom}
            onChange={(event) => {
              setDateFrom(event.target.value);
              setPage(1);
            }}
            title="من تاريخ"
          />

          <Input
            type="date"
            value={dateTo}
            onChange={(event) => {
              setDateTo(event.target.value);
              setPage(1);
            }}
            title="إلى تاريخ"
          />
        </div>
      </Card>

      {requestsQuery.isLoading ? (
        <Card><LoadingState label="جاري تحميل طلبات سداد الموردين..." /></Card>
      ) : requestsQuery.error ? (
        <Card><EmptyState title="فشل تحميل طلبات السداد" subtitle="راجع اتصال الخادم أو الصلاحيات." /></Card>
      ) : rows.length === 0 ? (
        <Card><EmptyState title="لا توجد طلبات سداد" subtitle="ستظهر طلبات السداد هنا بعد إنشائها." /></Card>
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {rows.map((request) => (
              <Card key={request.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-500">رقم التذكرة</p>
                    <h2 className="mt-1 truncate text-base font-black text-white">{request.request_number}</h2>
                  </div>
                  <StatusBadge status={request.status} />
                </div>

                <p className="mt-3 font-black text-white">{requestSupplierName(request)}</p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <Info label="المبلغ" value={formatCurrency(request.amount)} />
                  <Info label="الأولوية" value={supplierPaymentRequestPriorityLabel(request.priority)} />
                  <Info label="تاريخ الاستحقاق" value={formatDate(request.due_date)} />
                  <Info label="المسؤول" value={request.assigned_to} />
                  <Info label="آخر تحديث" value={formatDateTime(request.updated_at)} />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => setDetailsId(request.id)}>
                        <Eye className="h-4 w-4" />
                        عرض
                      </Button>
                      {canManage && (
                        <>
                          <Button variant="secondary" onClick={() => setDetailsId(request.id)}>
                            <Upload className="h-4 w-4" />
                            رفع مستند
                          </Button>
                          <Button variant="secondary" onClick={() => setEditing(request)}>
                            <Edit2 className="h-4 w-4" />
                            تعديل
                      </Button>
                      <Button variant="danger" onClick={() => confirmDelete(request)}>
                        <Trash2 className="h-4 w-4" />
                        حذف
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            ))}
          </div>

          <Card className="hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] text-right text-sm">
                <thead className="border-b border-slate-800 bg-slate-900/70 text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-black">رقم التذكرة</th>
                    <th className="px-4 py-3 font-black">المورد</th>
                    <th className="px-4 py-3 font-black">المبلغ</th>
                    <th className="px-4 py-3 font-black">الحالة</th>
                    <th className="px-4 py-3 font-black">الأولوية</th>
                    <th className="px-4 py-3 font-black">تاريخ الاستحقاق</th>
                    <th className="px-4 py-3 font-black">المسؤول</th>
                    <th className="px-4 py-3 font-black">آخر تحديث</th>
                    <th className="px-4 py-3 font-black">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {rows.map((request) => (
                    <tr key={request.id} className="hover:bg-slate-900/60">
                      <td className="px-4 py-4 font-black text-white">{request.request_number}</td>
                      <td className="px-4 py-4 text-slate-200">{requestSupplierName(request)}</td>
                      <td className="px-4 py-4 font-black text-white">{formatCurrency(request.amount)}</td>
                      <td className="px-4 py-4"><StatusBadge status={request.status} /></td>
                      <td className="px-4 py-4 text-slate-300">{supplierPaymentRequestPriorityLabel(request.priority)}</td>
                      <td className="px-4 py-4 text-slate-300">{formatDate(request.due_date)}</td>
                      <td className="px-4 py-4 text-slate-300">{request.assigned_to || "-"}</td>
                      <td className="px-4 py-4 text-slate-300">{formatDateTime(request.updated_at)}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Button variant="secondary" className="px-3" onClick={() => setDetailsId(request.id)} title="عرض">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canManage && (
                            <>
                              <Button variant="secondary" className="px-3" onClick={() => setEditing(request)} title="تعديل">
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button variant="secondary" className="px-3" onClick={() => setDetailsId(request.id)} title="رفع مستند">
                                <Upload className="h-4 w-4" />
                                <span className="sr-only">رفع مستند</span>
                              </Button>
                              <Button variant="danger" className="px-3" onClick={() => confirmDelete(request)} title="حذف">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
        <span>إجمالي النتائج: {formatNumber(total)}</span>
        <div className="flex items-center gap-2">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
            السابق
          </Button>
          <span className="font-bold text-slate-200">{page} / {totalPages}</span>
          <Button variant="secondary" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
            التالي
          </Button>
        </div>
      </div>
    </div>
  );
}

function SummaryCards({ summary }: { summary?: SupplierPaymentRequestSummary }) {
  const items = [
    { label: "إجمالي طلبات السداد", value: formatNumber(summaryValue(summary, "total_requests")) },
    { label: "طلبات معلقة", value: formatNumber(summaryValue(summary, "pending_requests")) },
    { label: "طلبات معتمدة", value: formatNumber(summaryValue(summary, "approved_requests")) },
    { label: "طلبات تم سدادها", value: formatNumber(summaryValue(summary, "paid_requests")) },
    { label: "طلبات مرفوضة / ملغاة", value: formatNumber(summaryValue(summary, "rejected_cancelled_requests")) },
    { label: "إجمالي المبالغ المستحقة", value: formatCurrency(summaryValue(summary, "total_due_amount")) },
    { label: "إجمالي المبالغ المسددة", value: formatCurrency(summaryValue(summary, "total_paid_amount")) },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} className="p-4">
          <p className="text-sm text-slate-400">{item.label}</p>
          <p className="mt-2 text-2xl font-black text-white">{item.value}</p>
        </Card>
      ))}
    </div>
  );
}

function SupplierPaymentRequestModal({
  request,
  onOpenDetails,
  onClose,
}: {
  request?: SupplierPaymentRequest | null;
  onOpenDetails?: (id: string) => void;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { setMessage } = useAuth();
  const [error, setError] = useState("");
  const [form, setForm] = useState<Partial<SupplierPaymentRequest>>(() => request ? { ...request } : emptyForm());
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>(() => extractSupplierIds(request));
  const [supplierSearch, setSupplierSearch] = useState("");
  const [documentType, setDocumentType] = useState<SupplierPaymentDocumentType>("Supplier Invoice");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const suppliersQuery = useQuery({ queryKey: ["suppliers"], queryFn: listSuppliers, staleTime: 60_000 });

  const supplierOptions = useMemo(() => {
    const term = supplierSearch.trim().toLowerCase();
    const suppliers = suppliersQuery.data || [];

    if (!term) return suppliers.slice(0, 50);

    return suppliers.filter((supplier) => {
      const haystack = [
        supplierName(supplier),
        supplier.phone,
        supplier.mobile,
        supplier.contact_phone,
        supplier.email,
        supplier.contact_email,
        supplier.city,
        supplier.category,
      ].filter(Boolean).join(" ").toLowerCase();

      return haystack.includes(term);
    }).slice(0, 50);
  }, [supplierSearch, suppliersQuery.data]);

  const selectedSuppliers = useMemo(() => {
    const ids = new Set(selectedSupplierIds);
    const fromList = (suppliersQuery.data || []).filter((supplier) => ids.has(String(supplier.id)));
    const existing = (request?.suppliers || []).filter((supplier) => ids.has(String(supplier.id)));
    const merged = new Map<string, Supplier | SupplierPaymentRequestSupplier>();

    [...existing, ...fromList].forEach((supplier) => merged.set(String(supplier.id), supplier));
    return [...merged.values()];
  }, [request?.suppliers, selectedSupplierIds, suppliersQuery.data]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: Partial<SupplierPaymentRequest> = {
        supplier_id: selectedSupplierIds[0] || null,
        supplier_ids: selectedSupplierIds,
        amount: numberValue(form.amount),
        status: form.status || "New",
        priority: form.priority || "Normal",
        due_date: form.due_date || null,
        payment_method: form.payment_method || null,
        invoice_number: form.invoice_number || null,
        reference_number: form.reference_number || null,
        assigned_to: form.assigned_to || null,
        notes: form.notes || null,
      };

      const savedRequest = request
        ? await updateSupplierPaymentRequest(request.id, payload)
        : await createSupplierPaymentRequest(payload);

      if (savedRequest?.id && selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          await uploadSupplierPaymentRequestDocument(savedRequest.id, { document_type: documentType, file });
        }
      }

      return { savedRequest, uploadedCount: selectedFiles.length };
    },
    onSuccess: ({ savedRequest, uploadedCount }) => {
      queryClient.invalidateQueries({ queryKey: ["supplierPaymentRequests"] });
      if (savedRequest?.id) {
        queryClient.invalidateQueries({ queryKey: ["supplierPaymentRequest", savedRequest.id] });
      }
      setSelectedFiles([]);
      setMessage(request ? "تم تحديث طلب السداد" : "تم إنشاء طلب السداد");
      if (uploadedCount > 0) {
        setMessage(request ? "تم تحديث طلب السداد ورفع المستندات" : "تم إنشاء طلب السداد ورفع المستندات");
      }
      onClose();
      if (!request && savedRequest?.id) {
        onOpenDetails?.(savedRequest.id);
      }
    },
    onError: (err) => setError(err instanceof Error ? err.message : "فشل حفظ طلب السداد"),
  });

  function setSupplier(id: string, selected: boolean) {
    if (selected && error === supplierRequiredMessage) {
      setError("");
    }

    setSelectedSupplierIds((current) => {
      if (selected) return current.includes(id) ? current : [...current, id];
      return current.filter((item) => item !== id);
    });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (selectedSupplierIds.length === 0) {
      setError(supplierRequiredMessage);
      return;
    }

    if (numberValue(form.amount) <= 0) {
      setError("المبلغ مطلوب ويجب أن يكون أكبر من صفر");
      return;
    }
    mutation.mutate();
  }

  return (
    <Modal title={request ? "تعديل طلب سداد" : "إنشاء طلب سداد"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        {request?.request_number && (
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-xs text-slate-500">رقم التذكرة</p>
            <p className="mt-1 text-lg font-black text-white">{request.request_number}</p>
          </div>
        )}

        <SupplierMultiSelect
          loading={suppliersQuery.isLoading}
          options={supplierOptions}
          search={supplierSearch}
          selectedIds={selectedSupplierIds}
          selectedSuppliers={selectedSuppliers}
          setSearch={setSupplierSearch}
          setSupplier={setSupplier}
          supplierError={error === supplierRequiredMessage ? error : ""}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="المبلغ" required>
            <Input
              dir="ltr"
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount ?? ""}
              onChange={(event) => setForm({ ...form, amount: event.target.value })}
            />
          </Field>

          <Field label="الحالة">
            <Select value={form.status || "New"} onChange={(event) => setForm({ ...form, status: event.target.value })}>
              {supplierPaymentRequestStatuses.map((item) => (
                <option className={statusOptionClassName} key={item.value} value={item.value}>{item.label}</option>
              ))}
            </Select>
          </Field>

          <Field label="الأولوية">
            <Select value={form.priority || "Normal"} onChange={(event) => setForm({ ...form, priority: event.target.value })}>
              {supplierPaymentRequestPriorities.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </Select>
          </Field>

          <Field label="تاريخ الاستحقاق">
            <Input type="date" value={form.due_date || ""} onChange={(event) => setForm({ ...form, due_date: event.target.value })} />
          </Field>

          <Field label="طريقة السداد">
            <Input value={form.payment_method || ""} onChange={(event) => setForm({ ...form, payment_method: event.target.value })} />
          </Field>

          <Field label="رقم الفاتورة">
            <Input value={form.invoice_number || ""} onChange={(event) => setForm({ ...form, invoice_number: event.target.value })} />
          </Field>

          <Field label="رقم المرجع">
            <Input value={form.reference_number || ""} onChange={(event) => setForm({ ...form, reference_number: event.target.value })} />
          </Field>

          <Field label="المسؤول">
            <Input value={form.assigned_to || ""} onChange={(event) => setForm({ ...form, assigned_to: event.target.value })} />
          </Field>
        </div>

        <Field label="ملاحظات">
          <Textarea value={form.notes || ""} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
        </Field>

        <PendingDocumentsSection
          documentType={documentType}
          selectedFiles={selectedFiles}
          setDocumentType={setDocumentType}
          setSelectedFiles={setSelectedFiles}
          disabled={mutation.isPending}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "جاري الحفظ..." : "حفظ"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function PendingDocumentsSection({
  documentType,
  selectedFiles,
  setDocumentType,
  setSelectedFiles,
  disabled,
}: {
  documentType: SupplierPaymentDocumentType;
  selectedFiles: File[];
  setDocumentType: (value: SupplierPaymentDocumentType) => void;
  setSelectedFiles: (value: File[]) => void;
  disabled: boolean;
}) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="font-black text-white">مستندات الطلب</h3>
          <p className="mt-1 text-sm text-slate-400">اختر الفاتورة أو الملفات المرتبطة ليتم رفعها تلقائيا بعد حفظ الطلب.</p>
        </div>

        <div className="grid gap-2 sm:grid-cols-[180px_1fr]">
          <Select value={documentType} onChange={(event) => setDocumentType(event.target.value as SupplierPaymentDocumentType)} disabled={disabled}>
            {supplierPaymentDocumentTypes.map((type) => (
              <option key={type} value={type}>{supplierPaymentDocumentTypeLabel(type)}</option>
            ))}
          </Select>
          <Input
            type="file"
            multiple
            disabled={disabled}
            onChange={(event) => setSelectedFiles(Array.from(event.target.files || []))}
          />
        </div>
      </div>

      {selectedFiles.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {selectedFiles.map((file) => (
            <span key={`${file.name}-${file.lastModified}`} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm font-bold text-slate-100">
              <FileText className="h-4 w-4" />
              {file.name}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

function SupplierPaymentRequestDetailsModal({
  requestId,
  canManage,
  onClose,
}: {
  requestId: string;
  canManage: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { setMessage } = useAuth();
  const [documentType, setDocumentType] = useState<SupplierPaymentDocumentType>("Supplier Invoice");
  const [file, setFile] = useState<File | null>(null);

  const detailsQuery = useQuery({
    queryKey: ["supplierPaymentRequest", requestId],
    queryFn: () => getSupplierPaymentRequest(requestId),
    staleTime: 30_000,
  });

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!file) throw new Error("اختر ملفًا للرفع");
      return uploadSupplierPaymentRequestDocument(requestId, { document_type: documentType, file });
    },
    onSuccess: () => {
      setFile(null);
      queryClient.invalidateQueries({ queryKey: ["supplierPaymentRequest", requestId] });
      queryClient.invalidateQueries({ queryKey: ["supplierPaymentRequests"] });
      setMessage("تم رفع المستند");
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "فشل رفع المستند"),
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: (documentId: string) => deleteSupplierPaymentRequestDocument(requestId, documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplierPaymentRequest", requestId] });
      setMessage("تم حذف المستند");
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "فشل حذف المستند"),
  });

  const request = detailsQuery.data;

  return (
    <Modal title="تفاصيل طلب السداد" onClose={onClose}>
      {detailsQuery.isLoading ? (
        <LoadingState label="جاري تحميل تفاصيل طلب السداد..." />
      ) : detailsQuery.error || !request ? (
        <EmptyState title="فشل تحميل تفاصيل طلب السداد" />
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <Info label="رقم التذكرة" value={request.request_number} />
            <Info label="المبلغ" value={formatCurrency(request.amount)} />
            <div>
              <p className="text-xs font-bold text-slate-500">الحالة</p>
              <div className="mt-1"><StatusBadge status={request.status} /></div>
            </div>
            <Info label="الأولوية" value={supplierPaymentRequestPriorityLabel(request.priority)} />
            <Info label="تاريخ الاستحقاق" value={formatDate(request.due_date)} />
            <Info label="طريقة السداد" value={request.payment_method} />
            <Info label="رقم الفاتورة" value={request.invoice_number} />
            <Info label="رقم المرجع" value={request.reference_number} />
            <Info label="المسؤول" value={request.assigned_to} />
            <Info label="تاريخ الإنشاء" value={formatDateTime(request.created_at)} />
            <Info label="آخر تحديث" value={formatDateTime(request.updated_at)} />
          </div>

          <section className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-xs font-bold text-slate-500">ملاحظات</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-100">{request.notes || "-"}</p>
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <h3 className="font-black text-white">الموردون المرتبطون</h3>
            {!request.suppliers?.length ? (
              <p className="mt-3 text-sm text-slate-400">لا يوجد موردون مرتبطون بهذا الطلب</p>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {request.suppliers.map((supplier) => (
                  <div key={supplier.id} className="rounded-lg border border-slate-800 bg-slate-900 p-3">
                    <p className="font-black text-white">{supplierName(supplier)}</p>
                    <p className="mt-1 text-xs text-slate-400" dir="ltr">{supplierMeta(supplier)}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <DocumentsSection
            documents={request.documents || []}
            canManage={canManage}
            documentType={documentType}
            file={file}
            setDocumentType={setDocumentType}
            setFile={setFile}
            uploadPending={uploadMutation.isPending}
            deletePending={deleteDocumentMutation.isPending}
            onUpload={() => uploadMutation.mutate()}
            onDelete={(document) => {
              if (window.confirm(`هل تريد حذف المستند ${document.file_name || ""}؟`)) {
                deleteDocumentMutation.mutate(document.id);
              }
            }}
          />

          <section className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <h3 className="font-black text-white">سجل النشاط</h3>
            {!request.activity_logs?.length ? (
              <p className="mt-3 text-sm text-slate-400">لا توجد أنشطة مسجلة</p>
            ) : (
              <div className="mt-4 space-y-3">
                {request.activity_logs.map((log) => (
                  <div key={log.id} className="rounded-lg border border-slate-800 bg-slate-900 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-black text-white">{log.action}</p>
                      <p className="text-xs text-slate-500">{formatDateTime(log.created_at)}</p>
                    </div>
                    <p className="mt-1 text-sm text-slate-400">{log.description || "-"}</p>
                    {(log.old_value || log.new_value) && (
                      <p className="mt-1 text-xs text-slate-500" dir="ltr">
                        {log.old_value || "-"} {" -> "} {log.new_value || "-"}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </Modal>
  );
}

function DocumentsSection({
  documents,
  canManage,
  documentType,
  file,
  setDocumentType,
  setFile,
  uploadPending,
  deletePending,
  onUpload,
  onDelete,
}: {
  documents: SupplierPaymentRequestDocument[];
  canManage: boolean;
  documentType: SupplierPaymentDocumentType;
  file: File | null;
  setDocumentType: (value: SupplierPaymentDocumentType) => void;
  setFile: (value: File | null) => void;
  uploadPending: boolean;
  deletePending: boolean;
  onUpload: () => void;
  onDelete: (document: SupplierPaymentRequestDocument) => void;
}) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="font-black text-white">المستندات</h3>
          <p className="mt-1 text-sm text-slate-400">فواتير المورد، عروض الأسعار، الإيصالات والتحويلات البنكية.</p>
        </div>

        {canManage && (
          <div className="grid gap-2 sm:grid-cols-[180px_1fr_auto]">
            <Select value={documentType} onChange={(event) => setDocumentType(event.target.value as SupplierPaymentDocumentType)}>
              {supplierPaymentDocumentTypes.map((type) => (
                <option key={type} value={type}>{supplierPaymentDocumentTypeLabel(type)}</option>
              ))}
            </Select>
            <Input type="file" onChange={(event) => setFile(event.target.files?.[0] || null)} />
            <Button onClick={onUpload} disabled={!file || uploadPending}>
              <Upload className="h-4 w-4" />
              {uploadPending ? "جاري الرفع..." : "رفع"}
            </Button>
          </div>
        )}
      </div>

      {!documents.length ? (
        <p className="mt-4 text-sm text-slate-400">لا توجد مستندات مرفوعة</p>
      ) : (
        <div className="mt-4 space-y-3">
          {documents.map((document) => {
            const href = fileHref(document.file_url);
            return (
              <div key={document.id} className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-900 p-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-black text-white">
                    <FileText className="h-4 w-4" />
                    <span className="truncate">{document.file_name || "-"}</span>
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {supplierPaymentDocumentTypeLabel(document.document_type)} | {formatNumber(document.file_size || 0)} بايت | {formatDateTime(document.created_at)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {href && (
                    <>
                      <a className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-bold text-slate-100 hover:bg-slate-700" href={href} target="_blank" rel="noreferrer">
                        فتح
                      </a>
                      <a className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-bold text-slate-100 hover:bg-slate-700" href={href} download>
                        تنزيل
                      </a>
                    </>
                  )}
                  {canManage && (
                    <Button variant="danger" onClick={() => onDelete(document)} disabled={deletePending}>
                      <Trash2 className="h-4 w-4" />
                      حذف
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function SupplierMultiSelect({
  loading,
  options,
  search,
  selectedIds,
  selectedSuppliers,
  setSearch,
  setSupplier,
  supplierError,
}: {
  loading: boolean;
  options: Supplier[];
  search: string;
  selectedIds: string[];
  selectedSuppliers: Array<Supplier | SupplierPaymentRequestSupplier>;
  setSearch: (value: string) => void;
  setSupplier: (id: string, selected: boolean) => void;
  supplierError?: string;
}) {
  return (
    <div>
      <Field label="الموردون" required>
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="ابحث باسم المورد أو الهاتف أو البريد أو المدينة"
        />
      </Field>

      {supplierError && (
        <p className="mt-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm font-bold text-rose-200">
          {supplierError}
        </p>
      )}

      {selectedSuppliers.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedSuppliers.map((supplier) => (
            <button
              key={supplier.id}
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-sm font-bold text-blue-100"
              onClick={() => setSupplier(String(supplier.id), false)}
            >
              {supplierName(supplier)}
              <X className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
      )}

      <div className={`mt-3 max-h-72 overflow-y-auto rounded-xl border bg-slate-950 ${supplierError ? "border-rose-500/60" : "border-slate-800"}`}>
        {loading ? (
          <div className="p-4 text-sm text-slate-400">جاري تحميل الموردين...</div>
        ) : options.length === 0 ? (
          <div className="p-4 text-sm text-slate-400">لا توجد نتائج مطابقة</div>
        ) : (
          options.map((supplier) => {
            const id = String(supplier.id);
            const checked = selectedIds.includes(id);

            return (
              <label key={id} className="flex cursor-pointer items-start gap-3 border-b border-slate-800 px-4 py-3 last:border-b-0 hover:bg-slate-900">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-900"
                  checked={checked}
                  onChange={(event) => setSupplier(id, event.target.checked)}
                />
                <span className="min-w-0">
                  <span className="block truncate font-bold text-white">{supplierName(supplier)}</span>
                  <span className="mt-1 block text-xs text-slate-500" dir="ltr">
                    {supplierMeta(supplier)}
                  </span>
                </span>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 font-black text-slate-100">{value || "-"}</p>
    </div>
  );
}
