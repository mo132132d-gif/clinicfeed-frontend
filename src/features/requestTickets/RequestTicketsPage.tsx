import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit2, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import type { RequestTicket } from "../../types";
import { useAuth } from "../auth/AuthProvider";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { formatDate } from "../../lib/format";
import { canManageSuppliers } from "../../lib/permissions";
import {
  createRequestTicket,
  deleteRequestTicket,
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

const statusOptions = [
  { value: "new", label: "جديدة", className: "border-blue-500/30 bg-blue-500/10 text-blue-200" },
  { value: "under_review", label: "قيد المراجعة", className: "border-purple-500/30 bg-purple-500/10 text-purple-200" },
  { value: "waiting_customer", label: "بانتظار العميل", className: "border-yellow-500/30 bg-yellow-500/10 text-yellow-200" },
  { value: "waiting_supplier", label: "بانتظار المورد", className: "border-orange-500/30 bg-orange-500/10 text-orange-200" },
  { value: "quotation_sent", label: "تم إرسال عرض السعر", className: "border-cyan-500/30 bg-cyan-500/10 text-cyan-200" },
  { value: "in_progress", label: "قيد التنفيذ", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" },
  { value: "completed", label: "منفذة", className: "border-green-500/30 bg-green-500/10 text-green-200" },
  { value: "cancelled", label: "ملغية", className: "border-rose-500/30 bg-rose-500/10 text-rose-200" },
] as const;

const viewOptions = [
  { value: "active", label: "التذاكر النشطة" },
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

type TicketStatus = RequestTicket["status"];
type ViewValue = RequestTicketParams["view"];

function statusLabel(status?: string | null) {
  return statusOptions.find((item) => item.value === status)?.label || status || "-";
}

function StatusBadge({ status }: { status?: string | null }) {
  const item = statusOptions.find((option) => option.value === status);

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${item?.className || "border-slate-700 bg-slate-800 text-slate-200"}`}>
      {item?.label || status || "-"}
    </span>
  );
}

function shortText(value?: string | null, limit = 90) {
  if (!value) return "-";
  return value.length > limit ? `${value.slice(0, limit)}...` : value;
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
    status: "new",
    priority: "medium",
    source: "",
    internal_notes: "",
    cancellation_reason: "",
  };
}

export function RequestTicketsPage() {
  const { user, setMessage } = useAuth();
  const queryClient = useQueryClient();

  const [view, setView] = useState<ViewValue>("active");
  const [status, setStatus] = useState("all");
  const [assignedTo, setAssignedTo] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<RequestTicket | null | undefined>(undefined);

  const debouncedSearch = useDebouncedValue(search, 250);
  const canManage = canManageSuppliers(user?.role);

  const params = useMemo<RequestTicketParams>(() => ({
    view,
    status,
    assigned_to: assignedTo.trim() || undefined,
    search: debouncedSearch.trim() || undefined,
  }), [view, status, assignedTo, debouncedSearch]);

  const ticketsQuery = useQuery({
    queryKey: ["requestTickets", params],
    queryFn: () => listRequestTickets(params),
    staleTime: 60_000,
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
        (!term || haystack.includes(term)) &&
        (status === "all" || ticket.status === status) &&
        (!assignedTo.trim() || String(ticket.assigned_to || "").toLowerCase().includes(assignedTo.trim().toLowerCase()))
      );
    });
  }, [tickets, debouncedSearch, status, assignedTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const hasRows = rows.length > 0;

  const deleteMutation = useMutation({
    mutationFn: deleteRequestTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requestTickets"] });
      setMessage("تم حذف التذكرة");
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "فشل حذف التذكرة"),
  });

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

      <Card className="p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">تذاكر الطلبات</h1>
            <p className="mt-1 text-sm text-slate-400">
              إنشاء ومتابعة طلبات العملاء اليدوية قبل التنفيذ أو الإلغاء.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => queryClient.invalidateQueries({ queryKey: ["requestTickets"] })}>
              <RefreshCw className="h-4 w-4" />
              تحديث
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

      <Card className="p-5">
        <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
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
            {statusOptions.map((item) => (
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
                <StatusBadge status={ticket.status} />
              </div>

              <p className="mt-3 font-black text-white">{ticket.customer_name}</p>
              <p className="mt-1 text-sm text-slate-400" dir="ltr">{ticket.phone || "-"}</p>
              <p className="mt-3 text-sm text-slate-400">{shortText(ticket.request_description)}</p>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <Info label="المسؤول" value={ticket.assigned_to} />
                <Info label="المنطقة" value={[ticket.country, ticket.region].filter(Boolean).join(" / ")} />
                <Info label="الإنشاء" value={formatDate(ticket.created_at)} />
                <Info label="الإغلاق" value={formatDate(ticket.closed_at)} />
              </div>

              {canManage && (
                <div className="mt-4 flex gap-2">
                  <Button variant="secondary" onClick={() => setEditing(ticket)}>
                    <Edit2 className="h-4 w-4" />
                    تعديل
                  </Button>
                  <Button variant="danger" onClick={() => confirmDelete(ticket)}>
                    <Trash2 className="h-4 w-4" />
                    حذف
                  </Button>
                </div>
              )}
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
            <table className="w-full min-w-[1300px] table-auto bg-slate-950 text-right text-sm">
              <thead className="bg-[#050B18] text-slate-300">
                <tr>
                  <th className="min-w-[170px] px-5 py-4 font-black text-center">رقم التذكرة</th>
                  <th className="min-w-[200px] px-5 py-4 font-black text-center">العميل</th>
                  <th className="min-w-[140px] px-5 py-4 font-black text-center">الجوال</th>
                  <th className="min-w-[150px] px-5 py-4 font-black text-center">الحالة</th>
                  <th className="min-w-[160px] px-5 py-4 font-black text-center">المسؤول</th>
                  <th className="min-w-[180px] px-5 py-4 font-black text-center">المنطقة</th>
                  <th className="min-w-[260px] px-5 py-4 font-black text-center">وصف الطلب</th>
                  <th className="min-w-[140px] px-5 py-4 font-black text-center">الإنشاء</th>
                  <th className="min-w-[140px] px-5 py-4 font-black text-center">الإغلاق</th>
                  <th className="min-w-[160px] px-5 py-4 font-black text-center">الإجراءات</th>
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
                    <td className="whitespace-nowrap px-5 py-4"><StatusBadge status={ticket.status} /></td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-400">{ticket.assigned_to || "-"}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-400">{[ticket.country, ticket.region].filter(Boolean).join(" / ") || "-"}</td>
                    <td className="px-5 py-4 text-slate-400">{shortText(ticket.request_description)}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-400">{formatDate(ticket.created_at)}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-400">{formatDate(ticket.closed_at)}</td>
                    <td className="whitespace-nowrap px-5 py-4">
                      {canManage ? (
                        <div className="flex flex-nowrap items-center gap-2">
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
                        </div>
                      ) : (
                        <span className="text-slate-500">عرض فقط</span>
                      )}
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

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 font-black text-slate-100">{value || "-"}</p>
    </div>
  );
}

function RequestTicketModal({ ticket, onClose }: { ticket?: RequestTicket | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { setMessage } = useAuth();
  const [error, setError] = useState("");
  const [form, setForm] = useState<Partial<RequestTicket>>(() => ticket ? { ...ticket } : emptyForm());

  const mutation = useMutation({
    mutationFn: () => {
      const payload: Partial<RequestTicket> = {
        customer_name: form.customer_name?.trim() || "",
        phone: form.phone?.trim() || null,
        email: form.email?.trim() || null,
        country: form.country?.trim() || null,
        region: form.region?.trim() || null,
        request_description: form.request_description?.trim() || "",
        assigned_to: form.assigned_to?.trim() || null,
        status: form.status || "new",
        priority: form.priority || "medium",
        source: form.source?.trim() || null,
        internal_notes: form.internal_notes?.trim() || null,
        cancellation_reason: form.status === "cancelled" ? form.cancellation_reason?.trim() || null : null,
      };

      return ticket ? updateRequestTicket(ticket.id, payload) : createRequestTicket(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requestTickets"] });
      setMessage(ticket ? "تم تحديث التذكرة" : "تم إنشاء التذكرة");
      onClose();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "فشل حفظ التذكرة"),
  });

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
            <Select value={form.status || "new"} onChange={(event) => setForm({ ...form, status: event.target.value as TicketStatus })}>
              {statusOptions.map((item) => (
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

        <Field label="وصف الطلب" required>
          <Textarea value={form.request_description || ""} onChange={(event) => setForm({ ...form, request_description: event.target.value })} />
        </Field>

        <Field label="ملاحظات داخلية">
          <Textarea value={form.internal_notes || ""} onChange={(event) => setForm({ ...form, internal_notes: event.target.value })} />
        </Field>

        {form.status === "cancelled" && (
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
