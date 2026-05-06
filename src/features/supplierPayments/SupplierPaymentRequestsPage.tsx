import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Trash2 } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { listSuppliers } from "../../services/supplierService";
import {
  createSupplierPaymentRequest,
  deleteSupplierPaymentRequest,
  listSupplierPaymentRequests,
  updateSupplierPaymentRequest,
  type SupplierPaymentRequest,
} from "../../services/supplierPaymentRequestService";
import type { Supplier } from "../../types";
import { Button, Card, EmptyState, Field, Input, LoadingState, Modal, Select, Textarea } from "../../components/shared/Primitives";

const statuses = ["جديد", "قيد المراجعة", "بانتظار مستندات", "معتمد", "مرفوض", "تم السداد", "ملغي"];
const priorities = ["عادي", "عاجل", "حرج"];
const reasons = ["فاتورة مورد", "دفعة مقدمة", "تسوية", "شحن", "تعويض", "أخرى"];

function formatDate(value?: string | null) {
  if (!value) return "-";
  return String(value).slice(0, 10);
}

function formatMoney(value?: number | string | null, currency = "SAR") {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return "-";
  return `${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function supplierNameFromRequest(request: SupplierPaymentRequest) {
  return request.supplier_name_ar || request.supplier_name_en || "-";
}

function supplierName(supplier: Supplier) {
  return supplier.name_ar || supplier.name_en || supplier.name || "-";
}

function statusClass(status?: string | null) {
  if (status === "تم السداد") return "border-emerald-500/30 bg-emerald-500/15 text-emerald-200";
  if (status === "مرفوض" || status === "ملغي") return "border-rose-500/30 bg-rose-500/15 text-rose-200";
  if (status === "معتمد") return "border-sky-500/30 bg-sky-500/15 text-sky-200";
  if (status === "بانتظار مستندات") return "border-amber-500/30 bg-amber-500/15 text-amber-200";
  if (status === "قيد المراجعة") return "border-blue-500/30 bg-blue-500/15 text-blue-200";
  return "border-slate-500/30 bg-slate-500/15 text-slate-200";
}

function priorityClass(priority?: string | null) {
  if (priority === "حرج") return "border-rose-500/30 bg-rose-500/15 text-rose-200";
  if (priority === "عاجل") return "border-amber-500/30 bg-amber-500/15 text-amber-200";
  return "border-slate-500/30 bg-slate-500/15 text-slate-200";
}

export function SupplierPaymentRequestsPage() {
  const { setMessage } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState<SupplierPaymentRequest | null | undefined>(undefined);

  const requestsQuery = useQuery({
    queryKey: ["supplierPaymentRequests", search, status],
    queryFn: () => listSupplierPaymentRequests({ search: search.trim() || undefined, status }),
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSupplierPaymentRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplierPaymentRequests"] });
      setEditing(undefined);
      setMessage("تم حذف طلب السداد");
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "فشل حذف طلب السداد"),
  });

  const rows = requestsQuery.data || [];

  return (
    <div className="space-y-6">
      {editing !== undefined && (
        <SupplierPaymentRequestModal
          request={editing}
          onDelete={(request) => {
            if (window.confirm(`هل تريد حذف طلب السداد ${request.request_number}؟`)) {
              deleteMutation.mutate(request.id);
            }
          }}
          onClose={() => setEditing(undefined)}
        />
      )}

      <Card className="p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">طلبات سداد الموردين</h1>
            <p className="mt-1 text-sm text-slate-400">إنشاء ومتابعة طلبات سداد الموردين.</p>
          </div>
          <Button onClick={() => setEditing(null)}>
            <Plus className="h-4 w-4" />
            طلب سداد جديد
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input className="pr-9" placeholder="بحث برقم الطلب أو المورد أو السبب" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">كل الحالات</option>
            {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {requestsQuery.isLoading ? (
          <LoadingState label="جاري تحميل طلبات السداد..." />
        ) : requestsQuery.error ? (
          <EmptyState title="فشل تحميل طلبات السداد" subtitle="تأكد من نشر الباكند وتطبيق جدول طلبات السداد." />
        ) : rows.length === 0 ? (
          <EmptyState title="لا توجد طلبات سداد" />
        ) : (
          <div className="hidden md:block">
            <table className="w-full table-fixed text-right text-sm">
              <thead className="bg-slate-950 text-slate-400">
                <tr>
                  <th className="w-[15%] px-5 py-4 font-black">رقم الطلب</th>
                  <th className="w-[25%] px-5 py-4 font-black">المورد</th>
                  <th className="w-[15%] px-5 py-4 font-black">المبلغ</th>
                  <th className="w-[15%] px-5 py-4 font-black">الحالة</th>
                  <th className="w-[10%] px-5 py-4 font-black">الأولوية</th>
                  <th className="w-[10%] px-5 py-4 font-black">الإنشاء</th>
                  <th className="w-[10%] px-5 py-4 font-black">الاستحقاق</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {rows.map((request) => (
                  <tr key={request.id} onClick={() => setEditing(request)} className="cursor-pointer hover:bg-slate-900">
                    <td className="truncate px-5 py-4 font-black text-white">{request.request_number}</td>
                    <td className="truncate px-5 py-4 text-slate-300">{supplierNameFromRequest(request)}</td>
                    <td className="truncate px-5 py-4 text-slate-300">{formatMoney(request.amount, request.currency || "SAR")}</td>
                    <td className="px-5 py-4"><span className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(request.status)}`}>{request.status}</span></td>
                    <td className="px-5 py-4"><span className={`rounded-full border px-3 py-1 text-xs font-black ${priorityClass(request.priority)}`}>{request.priority}</span></td>
                    <td className="truncate px-5 py-4 text-slate-400">{formatDate(request.created_at)}</td>
                    <td className="truncate px-5 py-4 text-slate-400">{formatDate(request.due_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function SupplierPaymentRequestModal({ request, onDelete, onClose }: { request?: SupplierPaymentRequest | null; onDelete: (request: SupplierPaymentRequest) => void; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { setMessage } = useAuth();
  const [error, setError] = useState("");
  const [supplierSearch, setSupplierSearch] = useState("");

  const [form, setForm] = useState<Partial<SupplierPaymentRequest>>({
    supplier_id: request?.supplier_id || "",
    amount: request?.amount || "",
    currency: request?.currency || "SAR",
    payment_reason: request?.payment_reason || "فاتورة مورد",
    description: request?.description || "",
    priority: request?.priority || "عادي",
    status: request?.status || "جديد",
    due_date: request?.due_date ? formatDate(request.due_date) : "",
    manager_notes: request?.manager_notes || "",
    rejection_reason: request?.rejection_reason || "",
    paid_amount: request?.paid_amount || "",
    paid_at: request?.paid_at ? formatDate(request.paid_at) : "",
  });

  const suppliersQuery = useQuery({ queryKey: ["suppliers"], queryFn: listSuppliers, staleTime: 60_000 });

  const supplierOptions = useMemo(() => {
    const term = supplierSearch.trim().toLowerCase();
    const suppliers = suppliersQuery.data || [];
    if (!term) return suppliers.slice(0, 50);
    return suppliers.filter((supplier) => [supplier.name_ar, supplier.name_en, supplier.name, supplier.phone, supplier.email, supplier.city, supplier.category].filter(Boolean).join(" ").toLowerCase().includes(term)).slice(0, 50);
  }, [supplierSearch, suppliersQuery.data]);

  const selectedSupplier = useMemo(() => (suppliersQuery.data || []).find((supplier) => String(supplier.id) === String(form.supplier_id)), [form.supplier_id, suppliersQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () => request?.id ? updateSupplierPaymentRequest(request.id, form) : createSupplierPaymentRequest(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplierPaymentRequests"] });
      setMessage("تم حفظ طلب السداد");
      onClose();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "فشل حفظ طلب السداد"),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!form.supplier_id) return setError("اختيار المورد مطلوب");
    if (!form.amount || Number(form.amount) <= 0) return setError("المبلغ مطلوب");
    if (!form.payment_reason) return setError("سبب السداد مطلوب");
    saveMutation.mutate();
  }

  return (
    <Modal title={request ? `طلب سداد ${request.request_number}` : "طلب سداد جديد"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>}

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="بحث المورد"><Input placeholder="ابحث باسم المورد أو الجوال أو التصنيف" value={supplierSearch} onChange={(e) => setSupplierSearch(e.target.value)} /></Field>
          <Field label="المورد" required>
            <Select value={form.supplier_id || ""} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}>
              <option value="">اختر المورد</option>
              {supplierOptions.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplierName(supplier)}</option>)}
            </Select>
          </Field>

          {selectedSupplier && (
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 md:col-span-2">
              <p className="font-black text-white">{supplierName(selectedSupplier)}</p>
            </div>
          )}

          <Field label="المبلغ المطلوب" required><Input dir="ltr" type="number" min="0" step="0.01" value={String(form.amount || "")} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
          <Field label="العملة"><Input dir="ltr" value={String(form.currency || "SAR")} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></Field>
          <Field label="سبب السداد" required><Select value={form.payment_reason || "فاتورة مورد"} onChange={(e) => setForm({ ...form, payment_reason: e.target.value })}>{reasons.map((item) => <option key={item} value={item}>{item}</option>)}</Select></Field>
          <Field label="الأولوية"><Select value={form.priority || "عادي"} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{priorities.map((item) => <option key={item} value={item}>{item}</option>)}</Select></Field>
          <Field label="الحالة"><Select value={form.status || "جديد"} onChange={(e) => setForm({ ...form, status: e.target.value })}>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</Select></Field>
          <Field label="تاريخ الاستحقاق"><Input type="date" value={String(form.due_date || "")} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></Field>
          <Field label="المبلغ المسدد فعليًا"><Input dir="ltr" type="number" min="0" step="0.01" value={String(form.paid_amount || "")} onChange={(e) => setForm({ ...form, paid_amount: e.target.value })} /></Field>
          <Field label="تاريخ السداد"><Input type="date" value={String(form.paid_at || "")} onChange={(e) => setForm({ ...form, paid_at: e.target.value })} /></Field>
          <Field label="وصف الطلب / ملاحظات الموظف"><Textarea value={String(form.description || "")} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label="ملاحظات المدير"><Textarea value={String(form.manager_notes || "")} onChange={(e) => setForm({ ...form, manager_notes: e.target.value })} /></Field>
          <Field label="سبب الرفض"><Textarea value={String(form.rejection_reason || "")} onChange={(e) => setForm({ ...form, rejection_reason: e.target.value })} /></Field>
        </div>

        <div className="flex flex-wrap justify-between gap-2">
          <div>{request?.id && <Button type="button" variant="danger" onClick={() => onDelete(request)}><Trash2 className="h-4 w-4" />حذف الطلب</Button>}</div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
            <Button type="submit" disabled={saveMutation.isPending}>حفظ</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
