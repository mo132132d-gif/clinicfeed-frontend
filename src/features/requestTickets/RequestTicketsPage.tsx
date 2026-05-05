import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { ChevronDown, Download, Edit2, Eye, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import type { RequestTicket, RequestTicketsSummary, Supplier } from "../../types";
import { useAuth } from "../auth/AuthProvider";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { formatCurrency, formatDate, formatNumber } from "../../lib/format";
import { canManageSuppliers } from "../../lib/permissions";
import {
  normalizeRequestTicketStatus,
  requestTicketStatusBadgeClass,
  requestTicketStatusLabel,
  requestTicketStatusOptions,
  type RequestTicketStatus,
} from "../../lib/requestTicketStatus";
import { listSuppliers } from "../../services/supplierService";
import {
  createRequestTicket,
  deleteRequestTicket,
  exportRequestTickets,
  getRequestTicketsSummary,
  listRequestTickets,
  updateRequestTicket,
  type RequestTicketParams,
} from "../../services/requestTicketService";
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

const viewOptions = [
  { value: "pending", label: "الطلبات المعلقة" },
  { value: "completed", label: "الطلبات المنفذة" },
  { value: "cancelled", label: "الطلبات الملغية" },
  { value: "all", label: "جميع التذاكر" },
] as const;

const priorityOptions = [
  { value: "low", label: "منخفضة" },
  { value: "medium", label: "متوسطة" },
  { value: "high", label: "عالية" },
  { value: "urgent", label: "عاجلة" },
];

const sourceOptions = [
  "واتساب",
  "اتصال",
  "إيميل",
  "الموقع",
  "عميل مباشر",
  "أخرى",
];

type TicketStatus = RequestTicketStatus;
type ViewValue = RequestTicketParams["view"];

function StatusBadge({ status }: { status?: string | null }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${requestTicketStatusBadgeClass(status)}`}>
      {requestTicketStatusLabel(status)}
    </span>
  );
}

function emptyForm(): Partial<RequestTicket> {
  return {
    customer_name: "",
    phone: "",
    email: "",
    country: "السعودية",
    region: "",
    request_description: "",
    assigned_to: "",
    status: "pending",
    priority: "medium",
    source: "",
    internal_notes: "",
    cancellation_reason: "",
    supplier_ids: [],
    order_amount: "",
    vat_amount: "",
    total_amount: 0,
  };
}

function ticketStatus(ticket: RequestTicket) {
  return normalizeRequestTicketStatus(ticket.status);
}

function isCancelledTicket(ticket: RequestTicket) {
  return ticketStatus(ticket) === "cancelled";
}

function isExecutedTicket(ticket: RequestTicket) {
  return ticketStatus(ticket) === "completed";
}

function matchesView(ticket: RequestTicket, view?: ViewValue) {
  if (view === "cancelled") return isCancelledTicket(ticket);
  if (view === "completed") return isExecutedTicket(ticket);
  if (view === "pending" || view === "active") return !isCancelledTicket(ticket) && !isExecutedTicket(ticket);
  return true;
}

function matchesDateRange(ticket: RequestTicket, dateFrom?: string, dateTo?: string) {
  const date = formatDate(ticket.created_at);
  if (date === "-") return !dateFrom && !dateTo;
  if (dateFrom && date < dateFrom) return false;
  if (dateTo && date > dateTo) return false;
  return true;
}

function numberValue(value?: number | string | null) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function optionalNumber(value?: number | string | null) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function summaryValue(summary: RequestTicketsSummary | undefined, keys: Array<keyof RequestTicketsSummary>) {
  for (const key of keys) {
    const value = summary?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return 0;
}

function supplierName(supplier: Supplier) {
  return supplier.name_ar || supplier.name_en || supplier.name || "-";
}

function supplierPhone(supplier: Supplier) {
  return supplier.phone || supplier.mobile || supplier.contact_phone || "-";
}

function supplierEmail(supplier: Supplier) {
  return supplier.email || supplier.contact_email || "-";
}

function extractSupplierIds(ticket?: RequestTicket | null) {
  if (!ticket) return [];
  if (Array.isArray(ticket.supplier_ids)) return ticket.supplier_ids.map(String);

  const linked = Array.isArray(ticket.suppliers)
    ? ticket.suppliers
    : Array.isArray(ticket.linked_suppliers)
      ? ticket.linked_suppliers
      : [];

  return linked.map((supplier) => String(supplier.id)).filter(Boolean);
}

function linkedSuppliers(ticket: RequestTicket, suppliers: Supplier[]) {
  const direct = Array.isArray(ticket.suppliers)
    ? ticket.suppliers
    : Array.isArray(ticket.linked_suppliers)
      ? ticket.linked_suppliers
      : [];

  if (direct.length > 0) return direct;

  const ids = new Set(extractSupplierIds(ticket));
  return suppliers.filter((supplier) => ids.has(String(supplier.id)));
}

function updateTicketInRequestTicketQueries(queryClient: QueryClient, updatedTicket: RequestTicket) {
  const normalizedStatus = normalizeRequestTicketStatus(updatedTicket.status);
  const nextTicket = { ...updatedTicket, status: normalizedStatus };

  queryClient.setQueriesData<RequestTicket[]>({ queryKey: ["requestTickets"] }, (current) => {
    if (!current) return current;
    return current.map((ticket) => (
      ticket.id === updatedTicket.id
        ? { ...ticket, ...nextTicket, status: normalizedStatus }
        : ticket
    ));
  });

  return nextTicket;
}

export function RequestTicketsPage() {
  const { user, setMessage } = useAuth();
  const queryClient = useQueryClient();

  const [view, setView] = useState<ViewValue>("pending");
  const [status, setStatus] = useState("all");
  const [assignedTo, setAssignedTo] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<RequestTicket | null | undefined>(undefined);
  const [details, setDetails] = useState<RequestTicket | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 250);
  const canManage = canManageSuppliers(user?.role);

  const params = useMemo<RequestTicketParams>(() => ({
    view,
    status,
    assigned_to: assignedTo.trim() || undefined,
    search: debouncedSearch.trim() || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  }), [view, status, assignedTo, debouncedSearch, dateFrom, dateTo]);

  const ticketsQuery = useQuery({
    queryKey: ["requestTickets", params],
    queryFn: () => listRequestTickets(params),
    staleTime: 60_000,
  });

  const summaryQuery = useQuery({
    queryKey: ["requestTicketsSummary"],
    queryFn: getRequestTicketsSummary,
    enabled: summaryOpen,
    staleTime: 60_000,
  });

  const suppliersQuery = useQuery({
    queryKey: ["suppliers"],
    queryFn: listSuppliers,
    staleTime: 60_000,
  });

  const exportMutation = useMutation({
    mutationFn: () => exportRequestTickets(params),
    onSuccess: ({ blob, filename }) => {
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      setMessage("تم تصدير البيانات");
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "فشل تصدير البيانات"),
  });

  const tickets = ticketsQuery.data || [];

  const filtered = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();

    return tickets.filter((ticket) => {
      const haystack = [
        ticket.ticket_number,
        ticket.customer_name,
        ticket.phone,
        ticket.email,
        ticket.country,
        ticket.region,
        ticket.request_description,
        ticket.assigned_to,
      ].filter(Boolean).join(" ").toLowerCase();

      return (
        matchesView(ticket, view) &&
        matchesDateRange(ticket, dateFrom, dateTo) &&
        (!term || haystack.includes(term)) &&
        (status === "all" || ticketStatus(ticket) === status) &&
        (!assignedTo.trim() || String(ticket.assigned_to || "").toLowerCase().includes(assignedTo.trim().toLowerCase()))
      );
    });
  }, [tickets, debouncedSearch, status, assignedTo, view, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const hasRows = rows.length > 0;

  const deleteMutation = useMutation({
    mutationFn: deleteRequestTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requestTickets"] });
      queryClient.invalidateQueries({ queryKey: ["requestTicketsSummary"] });
      setMessage("تم حذف التذكرة");
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "فشل حذف التذكرة"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: RequestTicketStatus }) => updateRequestTicket(id, { status }),
    onSuccess: (updatedTicket, variables) => {
      const nextTicket = updateTicketInRequestTicketQueries(queryClient, {
        ...updatedTicket,
        id: updatedTicket.id || variables.id,
        status: updatedTicket.status || variables.status,
      });

      setDetails((current) => (
        current?.id === variables.id
          ? { ...current, ...nextTicket }
          : current
      ));

      queryClient.invalidateQueries({ queryKey: ["requestTickets"] });
      queryClient.invalidateQueries({ queryKey: ["requestTicketsSummary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardRequestTicketsSummary"] });
      setMessage("تم تحديث حالة الطلب");
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "فشل تحديث حالة الطلب"),
  });

  function changeTicketStatus(ticket: RequestTicket, status: RequestTicketStatus) {
    if (!canManage) {
      setMessage("ليس لديك صلاحية لتنفيذ هذا الإجراء");
      return;
    }

    const normalizedStatus = normalizeRequestTicketStatus(status);
    if (normalizedStatus === ticketStatus(ticket)) return;
    statusMutation.mutate({ id: ticket.id, status: normalizedStatus });
  }

  function confirmDelete(ticket: RequestTicket) {
    if (!canManage) {
      setMessage("ليس لديك صلاحية لتنفيذ هذا الإجراء");
      return;
    }

    if (window.confirm(`هل تريد حذف التذكرة ${ticket.ticket_number}؟`)) {
      deleteMutation.mutate(ticket.id);
    }
  }

  return (
    <div className="space-y-6">
      {editing !== undefined && (
        <RequestTicketModal
          ticket={editing}
          onClose={() => setEditing(undefined)}
        />
      )}

      {details && (
        <RequestTicketDetailsModal
          ticket={details}
          suppliers={suppliersQuery.data || []}
          onClose={() => setDetails(null)}
        />
      )}

      <Card className="p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">تذاكر الطلبات</h1>
            <p className="mt-1 text-sm text-slate-400">
              إنشاء ومتابعة طلبات العملاء اليدوية قبل التنفيذ أو الإلغاء.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["requestTickets"] });
                queryClient.invalidateQueries({ queryKey: ["requestTicketsSummary"] });
              }}
            >
              <RefreshCw className="h-4 w-4" />
              تحديث
            </Button>

            <Button variant="secondary" onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending}>
              <Download className="h-4 w-4" />
              {exportMutation.isPending ? "جاري التصدير..." : "تصدير البيانات"}
            </Button>

            {canManage && (
              <Button onClick={() => setEditing(null)}>
                <Plus className="h-4 w-4" />
                تذكرة جديدة
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 p-5 text-right"
          onClick={() => setSummaryOpen((value) => !value)}
        >
          <div>
            <h2 className="text-lg font-black text-white">ملخص تذاكر الطلبات</h2>
            <p className="mt-1 text-sm text-slate-400">مؤشرات مالية وتشغيلية مجمعة من تذاكر الطلبات.</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-bold text-slate-100">
            عرض ملخص الطلبات
            <ChevronDown className={`h-4 w-4 transition ${summaryOpen ? "rotate-180" : ""}`} />
          </span>
        </button>

        {summaryOpen && (
          <div className="border-t border-slate-800 p-5">
            {summaryQuery.isLoading ? (
              <LoadingState label="جاري تحميل ملخص تذاكر الطلبات..." />
            ) : summaryQuery.error ? (
              <EmptyState title="فشل تحميل ملخص تذاكر الطلبات" />
            ) : (
              <SummaryGrid summary={summaryQuery.data} />
            )}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_1fr_0.8fr_0.8fr]">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              className="pr-9"
              placeholder="بحث برقم التذكرة أو العميل أو الجوال"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>

          <Select
            value={view}
            onChange={(event) => {
              setView(event.target.value as ViewValue);
              setPage(1);
            }}
          >
            {viewOptions.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </Select>

          <Select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="all">كل الحالات</option>
            {requestTicketStatusOptions.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </Select>

          <Input
            placeholder="الموظف المسؤول"
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

      {hasRows && (
        <div className="grid gap-3 md:hidden">
          {rows.map((ticket) => (
            <Card key={ticket.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-500">رقم التذكرة</p>
                  <h2 className="mt-1 truncate text-base font-black text-white">{ticket.ticket_number}</h2>
                </div>
                <TicketStatusSelect
                  ticket={ticket}
                  canManage={canManage}
                  disabled={statusMutation.isPending}
                  onChange={changeTicketStatus}
                />
              </div>

              <p className="mt-3 font-black text-white">{ticket.customer_name}</p>
              <p className="mt-1 text-sm text-slate-400" dir="ltr">{ticket.phone || "-"}</p>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <Info label="المسؤول" value={ticket.assigned_to} />
                <Info label="المنطقة" value={[ticket.country, ticket.region].filter(Boolean).join(" / ")} />
                <Info label="الإنشاء" value={formatDate(ticket.created_at)} />
                <Info label="الإغلاق" value={formatDate(ticket.closed_at)} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => setDetails(ticket)}>
                  <Eye className="h-4 w-4" />
                  عرض
                </Button>

                {canManage && (
                  <>
                    <Button variant="secondary" onClick={() => setEditing(ticket)}>
                      <Edit2 className="h-4 w-4" />
                      تعديل
                    </Button>
                    <Button variant="danger" onClick={() => confirmDelete(ticket)}>
                      <Trash2 className="h-4 w-4" />
                      حذف
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className={hasRows ? "hidden overflow-hidden md:block" : "overflow-hidden"}>
        {ticketsQuery.isLoading ? (
          <LoadingState label="جاري تحميل تذاكر الطلبات..." />
        ) : ticketsQuery.error ? (
          <EmptyState title="فشل تحميل تذاكر الطلبات" subtitle="تأكد من تشغيل الباكند ووجود مسار request-tickets." />
        ) : rows.length === 0 ? (
          <EmptyState title={tickets.length ? "لا توجد نتائج مطابقة" : "لا توجد تذاكر طلبات"} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] table-auto bg-slate-950 text-right text-sm">
              <thead className="bg-[#050B18] text-slate-300">
                <tr>
                  <th className="min-w-[170px] px-5 py-4 font-black text-center">رقم التذكرة</th>
                  <th className="min-w-[200px] px-5 py-4 font-black text-center">العميل</th>
                  <th className="min-w-[140px] px-5 py-4 font-black text-center">الجوال</th>
                  <th className="min-w-[150px] px-5 py-4 font-black text-center">الحالة</th>
                  <th className="min-w-[160px] px-5 py-4 font-black text-center">المسؤول</th>
                  <th className="min-w-[180px] px-5 py-4 font-black text-center">المنطقة</th>
                  <th className="min-w-[140px] px-5 py-4 font-black text-center">الإنشاء</th>
                  <th className="min-w-[140px] px-5 py-4 font-black text-center">الإغلاق</th>
                  <th className="min-w-[180px] px-5 py-4 font-black text-center">الإجراءات</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800 bg-slate-950">
                {rows.map((ticket) => (
                  <tr key={ticket.id} className="group bg-slate-950 hover:bg-slate-900/70 [&>td]:transition-colors [&>td]:group-hover:bg-slate-900/70">
                    <td className="whitespace-nowrap px-5 py-4 font-black text-white">{ticket.ticket_number}</td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <p className="font-black text-white">{ticket.customer_name}</p>
                      <p className="text-xs text-slate-500" dir="ltr">{ticket.email || "-"}</p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-400" dir="ltr">{ticket.phone || "-"}</td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <TicketStatusSelect
                        ticket={ticket}
                        canManage={canManage}
                        disabled={statusMutation.isPending}
                        onChange={changeTicketStatus}
                      />
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-400">{ticket.assigned_to || "-"}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-400">{[ticket.country, ticket.region].filter(Boolean).join(" / ") || "-"}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-400">{formatDate(ticket.created_at)}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-400">{formatDate(ticket.closed_at)}</td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="flex flex-nowrap items-center gap-2">
                        <button
                          className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-100 hover:bg-slate-700"
                          onClick={() => setDetails(ticket)}
                          title="عرض التفاصيل"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {canManage ? (
                          <>
                            <button
                              className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-blue-200 hover:bg-slate-700"
                              onClick={() => setEditing(ticket)}
                              title="تعديل"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>

                            <button
                              className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2 text-rose-200 hover:bg-rose-500/20"
                              onClick={() => confirmDelete(ticket)}
                              title="حذف"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-800 px-5 py-4 text-sm text-slate-400">
          <span>عرض {rows.length} من {filtered.length}</span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
              السابق
            </Button>
            <span>{page} / {totalPages}</span>
            <Button variant="secondary" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
              التالي
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function SummaryGrid({ summary }: { summary?: RequestTicketsSummary }) {
  const items = [
    { label: "إجمالي الطلبات", value: formatNumber(summaryValue(summary, ["total_requests", "total_tickets", "total"])) },
    { label: "الطلبات المنفذة", value: formatNumber(summaryValue(summary, ["executed_requests", "completed_requests", "completed"])) },
    { label: "الطلبات الملغاة", value: formatNumber(summaryValue(summary, ["cancelled_requests", "cancelled"])) },
    { label: "الطلبات المعلقة", value: formatNumber(summaryValue(summary, ["pending_requests", "pending"])) },
    { label: "مجموع مبالغ الطلبات", value: formatCurrency(summaryValue(summary, ["order_amount_sum", "total_order_amount"])) },
    { label: "مجموع الضريبة", value: formatCurrency(summaryValue(summary, ["vat_amount_sum", "total_vat_amount"])) },
    { label: "إجمالي المبالغ", value: formatCurrency(summaryValue(summary, ["total_amount_sum", "grand_total_amount"])) },
    { label: "متوسط قيمة الطلب", value: formatCurrency(summaryValue(summary, ["average_order_value", "avg_order_value"])) },
    { label: "أعلى قيمة طلب", value: formatCurrency(summaryValue(summary, ["max_order_value", "highest_order_value"])) },
    { label: "عدد الطلبات بدون مورد مرتبط", value: formatNumber(summaryValue(summary, ["tickets_without_supplier", "requests_without_supplier"])) },
    { label: "عدد الطلبات التي لديها موردين مرتبطين", value: formatNumber(summaryValue(summary, ["tickets_with_suppliers", "requests_with_suppliers"])) },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
          <p className="text-sm text-slate-500">{item.label}</p>
          <p className="mt-2 text-2xl font-black text-white">{item.value}</p>
        </div>
      ))}
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

function TicketStatusSelect({
  ticket,
  canManage,
  disabled,
  onChange,
}: {
  ticket: RequestTicket;
  canManage: boolean;
  disabled?: boolean;
  onChange: (ticket: RequestTicket, status: RequestTicketStatus) => void;
}) {
  const status = normalizeRequestTicketStatus(ticket.status);

  if (!canManage) {
    return <StatusBadge status={status} />;
  }

  return (
    <select
      value={status}
      disabled={disabled}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => onChange(ticket, event.target.value as RequestTicketStatus)}
      className={`h-9 rounded-full border px-3 py-1 text-xs font-black outline-none transition disabled:cursor-not-allowed disabled:opacity-60 ${requestTicketStatusBadgeClass(status)}`}
      aria-label="حالة الطلب"
    >
      {requestTicketStatusOptions.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
  );
}

function RequestTicketDetailsModal({
  ticket,
  suppliers,
  onClose,
}: {
  ticket: RequestTicket;
  suppliers: Supplier[];
  onClose: () => void;
}) {
  const linked = linkedSuppliers(ticket, suppliers);

  return (
    <Modal title="تفاصيل تذكرة الطلب" onClose={onClose}>
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-3">
          <Info label="رقم التذكرة" value={ticket.ticket_number} />
          <Info label="اسم العميل" value={ticket.customer_name} />
          <div>
            <p className="text-xs font-bold text-slate-500">الحالة</p>
            <div className="mt-1"><StatusBadge status={ticket.status} /></div>
          </div>
          <Info label="رقم الجوال" value={ticket.phone} />
          <Info label="البريد الإلكتروني" value={ticket.email} />
          <Info label="المنطقة" value={[ticket.country, ticket.region].filter(Boolean).join(" / ")} />
          <Info label="مبلغ الطلب" value={formatCurrency(ticket.order_amount)} />
          <Info label="الضريبة" value={formatCurrency(ticket.vat_amount)} />
          <Info label="الإجمالي" value={formatCurrency(ticket.total_amount ?? (numberValue(ticket.order_amount) + numberValue(ticket.vat_amount)))} />
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
          <p className="text-xs font-bold text-slate-500">وصف الطلب</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-100">{ticket.request_description || "-"}</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
          <h3 className="font-black text-white">الموردين المرتبطين</h3>
          {linked.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">لا يوجد موردين مرتبطين بهذه التذكرة</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[620px] text-right text-sm">
                <thead className="text-slate-400">
                  <tr>
                    <th className="px-3 py-2 font-black">اسم المورد</th>
                    <th className="px-3 py-2 font-black">رقم الجوال</th>
                    <th className="px-3 py-2 font-black">البريد الإلكتروني</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {linked.map((supplier) => (
                    <tr key={supplier.id}>
                      <td className="px-3 py-3 font-bold text-white">{supplierName(supplier)}</td>
                      <td className="px-3 py-3 text-slate-300" dir="ltr">{supplierPhone(supplier)}</td>
                      <td className="px-3 py-3 text-slate-300" dir="ltr">{supplierEmail(supplier)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function RequestTicketModal({ ticket, onClose }: { ticket?: RequestTicket | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { setMessage } = useAuth();
  const [error, setError] = useState("");
  const [form, setForm] = useState<Partial<RequestTicket>>(() => ticket ? { ...ticket } : emptyForm());
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>(() => extractSupplierIds(ticket));
  const [supplierSearch, setSupplierSearch] = useState("");
  const suppliersQuery = useQuery({ queryKey: ["suppliers"], queryFn: listSuppliers, staleTime: 60_000 });

  const orderAmount = numberValue(form.order_amount);
  const vatAmount = numberValue(form.vat_amount);
  const totalAmount = orderAmount + vatAmount;

  const supplierOptions = useMemo(() => {
    const term = supplierSearch.trim().toLowerCase();
    const suppliers = suppliersQuery.data || [];

    if (!term) return suppliers.slice(0, 40);

    return suppliers.filter((supplier) => {
      const haystack = [
        supplierName(supplier),
        supplier.phone,
        supplier.mobile,
        supplier.contact_phone,
        supplier.email,
        supplier.contact_email,
      ].filter(Boolean).join(" ").toLowerCase();

      return haystack.includes(term);
    }).slice(0, 40);
  }, [supplierSearch, suppliersQuery.data]);

  const selectedSuppliers = useMemo(() => {
    const ids = new Set(selectedSupplierIds);
    return (suppliersQuery.data || []).filter((supplier) => ids.has(String(supplier.id)));
  }, [selectedSupplierIds, suppliersQuery.data]);

  const mutation = useMutation({
    mutationFn: () => {
      const normalizedStatus = normalizeRequestTicketStatus(form.status);
      const payload: Partial<RequestTicket> = {
        customer_name: form.customer_name?.trim() || "",
        phone: form.phone?.trim() || null,
        email: form.email?.trim() || null,
        country: form.country?.trim() || null,
        region: form.region?.trim() || null,
        request_description: form.request_description?.trim() || "",
        assigned_to: form.assigned_to?.trim() || null,
        status: normalizedStatus,
        priority: form.priority || "medium",
        source: form.source?.trim() || null,
        internal_notes: form.internal_notes?.trim() || null,
        cancellation_reason: normalizedStatus === "cancelled" ? form.cancellation_reason?.trim() || null : null,
        supplier_ids: selectedSupplierIds,
        order_amount: optionalNumber(form.order_amount),
        vat_amount: optionalNumber(form.vat_amount),
        total_amount: totalAmount,
      };

      return ticket ? updateRequestTicket(ticket.id, payload) : createRequestTicket(payload);
    },
    onSuccess: (savedTicket) => {
      updateTicketInRequestTicketQueries(queryClient, savedTicket);
      queryClient.invalidateQueries({ queryKey: ["requestTickets"] });
      queryClient.invalidateQueries({ queryKey: ["requestTicketsSummary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardRequestTicketsSummary"] });
      setMessage(ticket ? "تم تحديث التذكرة" : "تم إنشاء التذكرة");
      onClose();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "فشل حفظ التذكرة"),
  });

  function setSupplier(id: string, selected: boolean) {
    setSelectedSupplierIds((current) => {
      if (selected) return current.includes(id) ? current : [...current, id];
      return current.filter((item) => item !== id);
    });
  }

  function submit(event: FormEvent) {
    event.preventDefault();

    if (!form.customer_name?.trim()) {
      setError("اسم العميل مطلوب");
      return;
    }

    if (!form.request_description?.trim()) {
      setError("وصف الطلب مطلوب");
      return;
    }

    if (!form.status) {
      setError("حالة الطلب مطلوبة");
      return;
    }

    mutation.mutate();
  }

  return (
    <Modal title={ticket ? "تعديل تذكرة طلب" : "إنشاء تذكرة طلب"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        {ticket?.ticket_number && (
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-xs text-slate-500">رقم التذكرة</p>
            <p className="mt-1 text-lg font-black text-white">{ticket.ticket_number}</p>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="اسم العميل" required>
            <Input value={form.customer_name || ""} onChange={(event) => setForm({ ...form, customer_name: event.target.value })} />
          </Field>

          <Field label="رقم الجوال">
            <Input dir="ltr" value={form.phone || ""} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          </Field>

          <Field label="البريد الإلكتروني">
            <Input dir="ltr" type="email" value={form.email || ""} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </Field>

          <Field label="الدولة">
            <Input value={form.country || ""} onChange={(event) => setForm({ ...form, country: event.target.value })} />
          </Field>

          <Field label="المنطقة / المدينة">
            <Input value={form.region || ""} onChange={(event) => setForm({ ...form, region: event.target.value })} />
          </Field>

          <Field label="الموظف المسؤول">
            <Input value={form.assigned_to || ""} onChange={(event) => setForm({ ...form, assigned_to: event.target.value })} />
          </Field>

          <Field label="الحالة" required>
            <Select value={normalizeRequestTicketStatus(form.status)} onChange={(event) => setForm({ ...form, status: event.target.value as TicketStatus })}>
              {requestTicketStatusOptions.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </Select>
          </Field>

          <Field label="الأولوية">
            <Select value={form.priority || "medium"} onChange={(event) => setForm({ ...form, priority: event.target.value })}>
              {priorityOptions.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </Select>
          </Field>

          <Field label="مصدر الطلب">
            <Select value={form.source || ""} onChange={(event) => setForm({ ...form, source: event.target.value })}>
              <option value="">غير محدد</option>
              {sourceOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Field label="مبلغ الطلب">
            <Input
              dir="ltr"
              type="number"
              min="0"
              step="0.01"
              value={form.order_amount ?? ""}
              onChange={(event) => setForm({ ...form, order_amount: event.target.value })}
            />
          </Field>

          <Field label="الضريبة">
            <Input
              dir="ltr"
              type="number"
              min="0"
              step="0.01"
              value={form.vat_amount ?? ""}
              onChange={(event) => setForm({ ...form, vat_amount: event.target.value })}
            />
          </Field>

          <Field label="الإجمالي">
            <Input dir="ltr" readOnly value={totalAmount.toFixed(2)} className="bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300" />
          </Field>
        </div>

        <SupplierMultiSelect
          loading={suppliersQuery.isLoading}
          options={supplierOptions}
          search={supplierSearch}
          selectedIds={selectedSupplierIds}
          selectedSuppliers={selectedSuppliers}
          setSearch={setSupplierSearch}
          setSupplier={setSupplier}
        />

        <Field label="وصف الطلب" required>
          <Textarea value={form.request_description || ""} onChange={(event) => setForm({ ...form, request_description: event.target.value })} />
        </Field>

        <Field label="ملاحظات داخلية">
          <Textarea value={form.internal_notes || ""} onChange={(event) => setForm({ ...form, internal_notes: event.target.value })} />
        </Field>

        {normalizeRequestTicketStatus(form.status) === "cancelled" && (
          <Field label="سبب الإلغاء">
            <Textarea value={form.cancellation_reason || ""} onChange={(event) => setForm({ ...form, cancellation_reason: event.target.value })} />
          </Field>
        )}

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

function SupplierMultiSelect({
  loading,
  options,
  search,
  selectedIds,
  selectedSuppliers,
  setSearch,
  setSupplier,
}: {
  loading: boolean;
  options: Supplier[];
  search: string;
  selectedIds: string[];
  selectedSuppliers: Supplier[];
  setSearch: (value: string) => void;
  setSupplier: (id: string, selected: boolean) => void;
}) {
  return (
    <div>
      <Field label="الموردين المرتبطين">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="ابحث باسم المورد أو رقم الجوال أو البريد"
        />
      </Field>

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

      <div className="mt-3 max-h-60 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950">
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
                <span>
                  <span className="block font-bold text-white">{supplierName(supplier)}</span>
                  <span className="mt-1 block text-xs text-slate-500" dir="ltr">
                    {[supplierPhone(supplier), supplierEmail(supplier)].filter((value) => value && value !== "-").join(" | ") || "-"}
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
