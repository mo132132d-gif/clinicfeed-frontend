import { FormEvent, useState } from "react";
import type { ReactNode } from "react";
import { Link, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ArrowRight, Copy, Download, Edit2, Plus, Save, Trash2, Upload } from "lucide-react";
import { allowedFileExtensions, contractStatuses, documentTypes, maxFileSize } from "../../lib/constants";
import { canArchiveSuppliers, canEditPerformance, canManageSuppliers, canUploadFiles } from "../../lib/permissions";
import { documentTypeLabel, expiryState, formatCurrency, formatDate, formatDateTime, formatNumber, parseCategories, percentage, serviceScoreLabel } from "../../lib/format";
import {
  archiveSupplier,
  createContact,
  createContract,
  createDocument,
  deleteContact,
  getSupplier,
  getSupplierPerformance,
  listContacts,
  listContracts,
  listDocuments,
  listSupplierActivity,
  markPrimaryContact,
  updateContact,
  updateContract,
  updateDocument,
  updateSupplierPerformance,
} from "../../services/supplierService";
import { useAuth } from "../auth/AuthProvider";
import type { Contact, Contract, SupplierDocument, SupplierPerformance } from "../../types";
import { Button, Card, EmptyState, ExpiryBadge, Field, Input, LoadingState, Modal, Select, StatusBadge, Textarea } from "../../components/shared/Primitives";
import { SupplierFormModal } from "./SupplierFormModal";

type Tab = "overview" | "contacts" | "documents" | "contracts" | "activity" | "performance";

function fileValidation(file?: File | null) {
  if (!file) return "";
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  if (!allowedFileExtensions.includes(extension)) return "نوع الملف غير مسموح";
  if (file.size > maxFileSize) return "حجم الملف يتجاوز 10MB";
  return "";
}

function emptyPerformance(): SupplierPerformance {
  return {
    total_orders: 0,
    fulfilled_orders: 0,
    cancelled_orders: 0,
    total_order_value: 0,
    supplier_revenue: 0,
    supplier_balance: 0,
    average_response_time: "",
    last_order_date: "",
    last_contact_date: "",
    last_price_list_update: "",
    price_accuracy_score: "",
    product_availability_score: "",
    delivery_commitment_score: "",
    response_speed_score: "",
    service_notes: "",
  };
}

function scoreAverage(performance?: SupplierPerformance | null) {
  const scores = [
    performance?.price_accuracy_score,
    performance?.product_availability_score,
    performance?.delivery_commitment_score,
    performance?.response_speed_score,
  ].map(Number).filter((value) => Number.isFinite(value) && value > 0);
  if (scores.length === 0) return null;
  return scores.reduce((sum, value) => sum + value, 0) / scores.length;
}

export function SupplierProfilePage() {
  const { id = "" } = useParams();
  const { user, setMessage } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("overview");
  const [modal, setModal] = useState<null | "supplier" | "contact" | "contract" | "document" | "performance">(null);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [editingDocument, setEditingDocument] = useState<SupplierDocument | null>(null);

  const supplierQuery = useQuery({ queryKey: ["supplier", id], queryFn: () => getSupplier(id), enabled: Boolean(id) });
  const contactsQuery = useQuery({ queryKey: ["supplier", id, "contacts"], queryFn: () => listContacts(id), enabled: Boolean(id) });
  const contractsQuery = useQuery({ queryKey: ["supplier", id, "contracts"], queryFn: () => listContracts(id), enabled: Boolean(id) });
  const documentsQuery = useQuery({ queryKey: ["supplier", id, "documents"], queryFn: () => listDocuments(id), enabled: Boolean(id) });
  const activityQuery = useQuery({ queryKey: ["supplier", id, "activity"], queryFn: () => listSupplierActivity(id), enabled: Boolean(id) });
  const performanceQuery = useQuery({ queryKey: ["supplier", id, "performance"], queryFn: () => getSupplierPerformance(id), enabled: Boolean(id) });

  const supplier = supplierQuery.data;
  const contacts = contactsQuery.data || [];
  const contracts = contractsQuery.data || [];
  const documents = documentsQuery.data || [];
  const performance = performanceQuery.data;
  const primaryContact = contacts.find((contact) => contact.is_primary);
  const cancellationRate = percentage(performance?.cancelled_orders, performance?.total_orders);
  const fulfillmentRate = percentage(performance?.fulfilled_orders, performance?.total_orders);
  const avgScore = scoreAverage(performance);

  const deleteContactMutation = useMutation({
    mutationFn: deleteContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier", id, "contacts"] });
      setMessage("تم حذف جهة التواصل");
    },
  });

  const primaryMutation = useMutation({
    mutationFn: markPrimaryContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier", id, "contacts"] });
      setMessage("تم تعيين جهة التواصل الأساسية");
    },
  });

  const archiveMutation = useMutation({
    mutationFn: archiveSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier", id] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setMessage("تمت أرشفة المورد");
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "فشلت الأرشفة"),
  });

  function confirmArchiveSupplier() {
    if (!canArchiveSuppliers(user?.role)) {
      setMessage("ليس لديك صلاحية لتنفيذ هذا الإجراء");
      return;
    }

    if (window.confirm("هل تريد أرشفة المورد؟")) {
      archiveMutation.mutate(id);
    }
  }

  const profileTabs: Array<{ key: Tab; label: string }> = [
    { key: "overview", label: "نظرة عامة" },
    { key: "contacts", label: "جهات الاتصال" },
    { key: "documents", label: "المستندات" },
    { key: "contracts", label: "العقود" },
    { key: "activity", label: "النشاط" },
    { key: "performance", label: "الأداء" },
  ];

  if (supplierQuery.isLoading) return <LoadingState label="جاري تحميل ملف المورد..." />;
  if (!supplier) return <EmptyState title="لم يتم العثور على المورد" />;

  const metrics = [
    ["إجمالي الطلبات", formatNumber(performance?.total_orders)],
    ["الطلبات المنفذة", formatNumber(performance?.fulfilled_orders)],
    ["الطلبات الملغاة", formatNumber(performance?.cancelled_orders)],
    ["نسبة الإلغاء", cancellationRate === null ? "-" : `${cancellationRate.toFixed(1)}%`],
    ["إجمالي الإيرادات", formatCurrency(performance?.supplier_revenue)],
    ["متوسط قيمة الطلب", Number(performance?.total_orders || 0) > 0 ? formatCurrency(Number(performance?.total_order_value || 0) / Number(performance?.total_orders || 1)) : "-"],
    ["متوسط سرعة الرد", performance?.average_response_time ? `${performance.average_response_time}` : "-"],
    ["نسبة توفر المنتجات", performance?.product_availability_score ? `${performance.product_availability_score}/5` : "-"],
    ["عدد المنتجات غير المتوفرة", "-"],
    ["عدد مرات تغيير السعر", "-"],
    ["آخر نشاط", formatDate(performance?.last_order_date || performance?.last_contact_date)],
    ["تقييم داخلي للمورد", avgScore === null ? "غير محسوب" : `${avgScore.toFixed(1)} - ${serviceScoreLabel(avgScore)}`],
  ];

  return (
    <div className="space-y-6">
      {modal === "contact" && <ContactModal supplierId={id} contact={editingContact} onClose={() => { setModal(null); setEditingContact(null); }} />}
      {modal === "contract" && <ContractModal supplierId={id} contract={editingContract} onClose={() => { setModal(null); setEditingContract(null); }} />}
      {modal === "document" && <DocumentModal supplierId={id} document={editingDocument} onClose={() => { setModal(null); setEditingDocument(null); }} />}
      {modal === "performance" && <PerformanceModal supplierId={id} performance={performance} onClose={() => setModal(null)} />}
      {modal === "supplier" && <SupplierFormModal supplier={supplier} onClose={() => setModal(null)} onSaved={() => setMessage("تم حفظ بيانات المورد")} />}

      <Link to="/suppliers" className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white">
        <ArrowRight className="h-4 w-4" />
        العودة إلى الموردين
      </Link>

      <Card className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-black text-white">{supplier.name_ar}</h1>
              <StatusBadge status={supplier.status} />
            </div>
            <p className="mt-2 text-slate-500" dir="ltr">{supplier.name_en || "-"}</p>
            <p className="mt-3 text-sm text-slate-400">معرّف المورد: <span dir="ltr">{supplier.id}</span></p>
            {(canManageSuppliers(user?.role) || canArchiveSuppliers(user?.role)) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {canManageSuppliers(user?.role) && (
                  <Button onClick={() => setModal("supplier")}>
                    <Edit2 className="h-4 w-4" />
                    تعديل المورد
                  </Button>
                )}

                {canArchiveSuppliers(user?.role) && (
                  <Button variant="danger" onClick={confirmArchiveSupplier} disabled={archiveMutation.isPending}>
                    <Archive className="h-4 w-4" />
                    أرشفة المورد
                  </Button>
                )}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
            <Info label="المدينة" value={supplier.city} />
            <Info label="السجل التجاري" value={supplier.cr_number} ltr />
            <Info label="الرقم الضريبي" value={supplier.vat_number} ltr />
            <Info label="التصنيفات" value={parseCategories(supplier.category).join(", ")} />
            <Info label="آخر تحديث" value={formatDate(supplier.updated_at || supplier.created_at)} />
          </div>
        </div>
      </Card>

      <div className="overflow-x-auto">
        <div className="inline-flex min-w-max gap-2 rounded-xl border border-slate-800 bg-[#111827] p-2">
          {profileTabs.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`rounded-lg px-4 py-2 text-sm font-black transition ${tab === item.key ? "bg-blue-800 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "overview" && (
        <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
          <Card className="p-5">
            <h2 className="mb-4 text-lg font-black text-white">البيانات الأساسية</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <InfoBlock label="البريد الإلكتروني" value={<EmailLink email={primaryContact?.email} />} />
              <InfoBlock label="رقم الجوال" value={<PhoneActionMenu phone={primaryContact?.phone || primaryContact?.whatsapp} />} />
              <InfoBlock label="العنوان" value={supplier.city} />
              <InfoBlock label="الموقع الإلكتروني" value="-" />
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="mb-4 text-lg font-black text-white">الملاحظات</h2>
            <p className="min-h-32 rounded-xl border border-slate-800 bg-slate-950 p-4 text-slate-300">{supplier.notes || "لا توجد ملاحظات"}</p>
          </Card>
        </div>
      )}

      {tab === "contacts" && (
        <TableCard title="جهات الاتصال" action={canManageSuppliers(user?.role) ? <Button onClick={() => setModal("contact")}><Plus className="h-4 w-4" />إضافة</Button> : null}>
          {contacts.length === 0 ? <EmptyState title="لا توجد جهات تواصل لهذا المورد" /> : (
            <table className="min-w-[900px] text-right text-sm">
              <thead className="bg-slate-950 text-slate-400"><tr>{["الاسم", "المنصب", "البريد الإلكتروني", "رقم الجوال", "أساسي", "الإجراءات"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-800">{contacts.map((contact) => (
                <tr key={contact.id}>
                  <td className="whitespace-nowrap px-4 py-3 font-bold text-white">{contact.name}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-400">{contact.position || "-"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-400" dir="ltr"><EmailLink email={contact.email} /></td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-400" dir="ltr"><PhoneActionMenu phone={contact.phone || contact.whatsapp} /></td>
                  <td className="whitespace-nowrap px-4 py-3">{contact.is_primary ? "أساسي" : "غير أساسي"}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {canManageSuppliers(user?.role) && <div className="flex flex-nowrap gap-2">
                      <Button variant="secondary" onClick={() => { setEditingContact(contact); setModal("contact"); }}><Edit2 className="h-4 w-4" /></Button>
                      {!contact.is_primary && <Button variant="secondary" onClick={() => primaryMutation.mutate(contact.id)}>تعيين أساسي</Button>}
                      <Button variant="danger" onClick={() => window.confirm("هل تريد حذف جهة التواصل؟") && deleteContactMutation.mutate(contact.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </TableCard>
      )}

      {tab === "documents" && (
        <TableCard title="المستندات" action={canUploadFiles(user?.role) ? <Button onClick={() => setModal("document")}><Upload className="h-4 w-4" />رفع مستند</Button> : null}>
          <DocumentsTable documents={documents} onEdit={(item) => { setEditingDocument(item); setModal("document"); }} canEdit={canUploadFiles(user?.role)} />
        </TableCard>
      )}

      {tab === "contracts" && (
        <TableCard title="العقود" action={canUploadFiles(user?.role) ? <Button onClick={() => setModal("contract")}><Upload className="h-4 w-4" />رفع عقد</Button> : null}>
          <ContractsTable contracts={contracts} onEdit={(item) => { setEditingContract(item); setModal("contract"); }} canEdit={canUploadFiles(user?.role)} />
        </TableCard>
      )}

      {tab === "activity" && (
        <Card className="p-5">
          <h2 className="text-lg font-black text-white">النشاط</h2>
          {(activityQuery.data || []).length === 0 ? <EmptyState title="لا توجد سجلات نشاط متاحة حاليًا" /> : (
            <div className="mt-5 space-y-4">
              {(activityQuery.data || []).map((item) => (
                <div key={item.id} className="border-r-2 border-blue-700 pr-4">
                  <p className="font-bold text-white">{item.action}</p>
                  <p className="text-sm text-slate-500">{item.entity_type} · {formatDateTime(item.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === "performance" && (
        <div className="space-y-6">
          <div className="flex justify-end">{canEditPerformance(user?.role) && <Button onClick={() => setModal("performance")}><Edit2 className="h-4 w-4" />تعديل المؤشرات</Button>}</div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {metrics.map(([label, value]) => (
              <Card key={label} className="p-4">
                <p className="text-sm text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-black text-white">{value}</p>
              </Card>
            ))}
          </div>
          <Card className="p-5">
            <h2 className="text-lg font-black text-white">ملاحظات مستوى الخدمة</h2>
            <p className="mt-3 rounded-xl border border-slate-800 bg-slate-950 p-4 text-slate-300">{performance?.service_notes || "لا توجد ملاحظات"}</p>
          </Card>
        </div>
      )}
    </div>
  );
}

function Info({ label, value, ltr = false }: { label: string; value?: string | null; ltr?: boolean }) {
  return <div className="rounded-xl border border-slate-800 bg-slate-950 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-bold text-white" dir={ltr ? "ltr" : "rtl"}>{value || "-"}</p></div>;
}

function InfoBlock({ label, value }: { label: string; value?: ReactNode }) {
  return <div className="rounded-xl border border-slate-800 bg-slate-950 p-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 font-bold text-white">{value || "-"}</p></div>;
}

function normalizeWhatsAppNumber(phone: string) {
  return phone.replace(/[^\d]/g, "");
}

function PhoneActionMenu({ phone }: { phone?: string | null }) {
  const [open, setOpen] = useState(false);

  if (!phone) return <span className="text-slate-500">-</span>;

  const whatsappNumber = normalizeWhatsAppNumber(phone);

  return (
    <span className="relative inline-block">
      <span className="hidden md:inline" dir="ltr">{phone}</span>
      <button
        type="button"
        className="font-bold text-blue-200 underline-offset-4 hover:underline md:hidden"
        onClick={() => setOpen((value) => !value)}
        dir="ltr"
      >
        {phone}
      </button>
      {open && (
        <span className="absolute right-0 top-full z-20 mt-2 grid min-w-32 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 text-right shadow-xl md:hidden">
          <a className="px-4 py-3 text-sm font-bold text-emerald-200 hover:bg-slate-800" href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer">
            WhatsApp
          </a>
          <a className="px-4 py-3 text-sm font-bold text-blue-200 hover:bg-slate-800" href={`tel:${phone}`}>
            Call
          </a>
        </span>
      )}
    </span>
  );
}

function EmailLink({ email }: { email?: string | null }) {
  if (!email) return <span className="text-slate-500">-</span>;
  return <a className="text-blue-200 underline-offset-4 hover:underline" href={`mailto:${email}`} dir="ltr">{email}</a>;
}

function TableCard({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return <Card className="overflow-hidden"><div className="flex items-center justify-between border-b border-slate-800 p-5"><h2 className="text-lg font-black text-white">{title}</h2>{action}</div><div className="overflow-x-auto">{children}</div></Card>;
}

function DocumentsTable({ documents, onEdit, canEdit }: { documents: SupplierDocument[]; onEdit: (document: SupplierDocument) => void; canEdit: boolean }) {
  if (documents.length === 0) return <EmptyState title="لا توجد مستندات لهذا المورد" />;
  return <table className="min-w-[1000px] text-right text-sm"><thead className="bg-slate-950 text-slate-400"><tr>{["نوع المستند", "تاريخ الانتهاء", "تاريخ الرفع", "الحالة", "الملف", "الإجراءات"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-800">{documents.map((document) => <tr key={document.id}><td className="whitespace-nowrap px-4 py-3 font-bold text-white">{documentTypeLabel(document.type)}</td><td className="whitespace-nowrap px-4 py-3 text-slate-400">{formatDate(document.expiry_date)}</td><td className="whitespace-nowrap px-4 py-3 text-slate-400">{formatDate(document.created_at || document.last_updated)}</td><td className="whitespace-nowrap px-4 py-3"><ExpiryBadge date={document.expiry_date} /></td><td className="whitespace-nowrap px-4 py-3"><FileActions url={document.file_url} /></td><td className="whitespace-nowrap px-4 py-3">{canEdit && <Button variant="secondary" onClick={() => onEdit(document)}><Edit2 className="h-4 w-4" /></Button>}</td></tr>)}</tbody></table>;
}

function ContractsTable({ contracts, onEdit, canEdit }: { contracts: Contract[]; onEdit: (contract: Contract) => void; canEdit: boolean }) {
  if (contracts.length === 0) return <EmptyState title="لا توجد عقود لهذا المورد" />;
  return <table className="min-w-[1000px] text-right text-sm"><thead className="bg-slate-950 text-slate-400"><tr>{["رقم العقد", "النوع", "تاريخ البداية", "تاريخ النهاية", "الحالة", "المالك", "الملف", "الإجراءات"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-800">{contracts.map((contract) => <tr key={contract.id}><td className="whitespace-nowrap px-4 py-3 font-bold text-white">{contract.contract_number}</td><td className="whitespace-nowrap px-4 py-3 text-slate-400">{contract.contract_type || "-"}</td><td className="whitespace-nowrap px-4 py-3 text-slate-400">{formatDate(contract.start_date)}</td><td className="whitespace-nowrap px-4 py-3 text-slate-400">{formatDate(contract.end_date)}</td><td className="whitespace-nowrap px-4 py-3"><ExpiryBadge date={contract.end_date} /></td><td className="whitespace-nowrap px-4 py-3 text-slate-400">{contract.owner || "-"}</td><td className="whitespace-nowrap px-4 py-3"><FileActions url={contract.file_url} /></td><td className="whitespace-nowrap px-4 py-3">{canEdit && <Button variant="secondary" onClick={() => onEdit(contract)}><Edit2 className="h-4 w-4" /></Button>}</td></tr>)}</tbody></table>;
}

function FileActions({ url }: { url?: string | null }) {
  if (!url) return <span className="text-slate-500">-</span>;
  return <div className="flex flex-nowrap gap-2"><Button variant="secondary" onClick={() => window.open(url, "_blank", "noopener,noreferrer")}><Download className="h-4 w-4" />فتح</Button><Button variant="secondary" onClick={() => navigator.clipboard.writeText(url)}><Copy className="h-4 w-4" />نسخ</Button></div>;
}

function ContactModal({ supplierId, contact, onClose }: { supplierId: string; contact?: Contact | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: contact?.name || "", position: contact?.position || "", email: contact?.email || "", phone: contact?.phone || "", whatsapp: contact?.whatsapp || "", is_primary: Boolean(contact?.is_primary) });
  const mutation = useMutation({ mutationFn: () => contact ? updateContact(contact.id, form) : createContact(supplierId, form), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["supplier", supplierId, "contacts"] }); onClose(); } });
  return <Modal title={contact ? "تعديل جهة اتصال" : "إضافة جهة اتصال"} onClose={onClose}><form className="space-y-4" onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}><div className="grid gap-4 md:grid-cols-2"><Field label="الاسم" required><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field><Field label="المنصب"><Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></Field><Field label="البريد الإلكتروني"><Input dir="ltr" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field><Field label="رقم الجوال"><Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field></div><label className="flex items-center gap-2 text-sm text-slate-200"><input type="checkbox" checked={form.is_primary} onChange={(e) => setForm({ ...form, is_primary: e.target.checked })} /> جهة تواصل أساسية</label><div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose} type="button">إلغاء</Button><Button disabled={mutation.isPending} type="submit">حفظ</Button></div></form></Modal>;
}

function ContractModal({ supplierId, contract, onClose }: { supplierId: string; contract?: Contract | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { setMessage } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ contract_number: contract?.contract_number || "", contract_type: contract?.contract_type || "", start_date: formatDate(contract?.start_date) === "-" ? "" : formatDate(contract?.start_date), end_date: formatDate(contract?.end_date) === "-" ? "" : formatDate(contract?.end_date), status: contract?.status || "Active", owner: contract?.owner || "", notes: contract?.notes || "" });
  const mutation = useMutation({ mutationFn: () => contract ? updateContract(contract.id, form, file) : createContract(supplierId, form, file), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["supplier", supplierId, "contracts"] }); setMessage("تم حفظ العقد بنجاح"); onClose(); }, onError: () => { setError("فشل رفع الملف"); setMessage("فشل رفع الملف"); } });
  function submit(event: FormEvent) { event.preventDefault(); const err = fileValidation(file); if (err) return setError(err); if (!contract && !file) return setError("الملف مطلوب"); mutation.mutate(); }
  return <Modal title={contract ? "تعديل عقد" : "إضافة عقد"} onClose={onClose}><form className="space-y-4" onSubmit={submit}>{error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-200">{error}</div>}<div className="grid gap-4 md:grid-cols-2"><Field label="رقم العقد" required><Input value={form.contract_number} onChange={(e) => setForm({ ...form, contract_number: e.target.value })} required /></Field><Field label="نوع العقد"><Input value={form.contract_type} onChange={(e) => setForm({ ...form, contract_type: e.target.value })} /></Field><Field label="تاريخ البداية" required><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required /></Field><Field label="تاريخ النهاية" required><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} required /></Field><Field label="الحالة"><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Contract["status"] })}>{contractStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select></Field><Field label="المالك"><Input value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} /></Field><Field label="ملف العقد"><Input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" onChange={(e) => setFile(e.target.files?.[0] || null)} />{file && <p className="mt-2 text-xs text-slate-400">{file.name}</p>}</Field></div><Field label="ملاحظات"><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field><div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose} type="button">إلغاء</Button><Button disabled={mutation.isPending} type="submit">{mutation.isPending ? "جاري الرفع..." : "حفظ"}</Button></div></form></Modal>;
}

function DocumentModal({ supplierId, document, onClose }: { supplierId: string; document?: SupplierDocument | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { setMessage } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ type: document?.type || "CR", expiry_date: formatDate(document?.expiry_date) === "-" ? "" : formatDate(document?.expiry_date), last_updated: formatDate(document?.last_updated) === "-" ? "" : formatDate(document?.last_updated) });
  const mutation = useMutation({ mutationFn: () => document ? updateDocument(document.id, form, file) : createDocument(supplierId, form, file), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["supplier", supplierId, "documents"] }); setMessage("تم حفظ المستند بنجاح"); onClose(); }, onError: () => { setError("فشل رفع الملف"); setMessage("فشل رفع الملف"); } });
  function submit(event: FormEvent) { event.preventDefault(); const err = fileValidation(file); if (err) return setError(err); if (!document && !file) return setError("الملف مطلوب"); mutation.mutate(); }
  return <Modal title={document ? "تعديل مستند" : "رفع مستند"} onClose={onClose}><form className="space-y-4" onSubmit={submit}>{error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-200">{error}</div>}<div className="grid gap-4 md:grid-cols-2"><Field label="نوع المستند" required><Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as SupplierDocument["type"] })}>{documentTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select></Field><Field label="تاريخ الانتهاء"><Input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} /></Field><Field label="تاريخ الإصدار / التحديث"><Input type="date" value={form.last_updated} onChange={(e) => setForm({ ...form, last_updated: e.target.value })} /></Field><Field label="ملف المستند"><Input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" onChange={(e) => setFile(e.target.files?.[0] || null)} />{file && <p className="mt-2 text-xs text-slate-400">{file.name}</p>}</Field></div><div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose} type="button">إلغاء</Button><Button disabled={mutation.isPending} type="submit">{mutation.isPending ? "جاري الرفع..." : "حفظ"}</Button></div></form></Modal>;
}

function PerformanceModal({ supplierId, performance, onClose }: { supplierId: string; performance?: SupplierPerformance | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SupplierPerformance>({ ...emptyPerformance(), ...(performance || {}) });
  const mutation = useMutation({ mutationFn: () => updateSupplierPerformance(supplierId, form), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["supplier", supplierId, "performance"] }); queryClient.invalidateQueries({ queryKey: ["supplier-performance"] }); onClose(); } });
  const set = (key: keyof SupplierPerformance, value: string) => setForm((current) => ({ ...current, [key]: value }));
  return <Modal title="تعديل مؤشرات المورد" onClose={onClose}><form className="space-y-4" onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}><div className="grid gap-4 md:grid-cols-3">{["total_orders", "fulfilled_orders", "cancelled_orders", "total_order_value", "supplier_revenue", "supplier_balance", "average_response_time", "price_accuracy_score", "product_availability_score", "delivery_commitment_score", "response_speed_score"].map((key) => <Field key={key} label={({ total_orders: "إجمالي الطلبات", fulfilled_orders: "الطلبات المنفذة", cancelled_orders: "الطلبات الملغاة", total_order_value: "إجمالي قيمة الطلبات", supplier_revenue: "إيرادات المورد", supplier_balance: "رصيد المورد", average_response_time: "متوسط سرعة الرد", price_accuracy_score: "تقييم دقة الأسعار", product_availability_score: "تقييم توفر المنتجات", delivery_commitment_score: "تقييم الالتزام بالتسليم", response_speed_score: "تقييم سرعة الاستجابة" } as Record<string, string>)[key]}><Input type="number" min="0" step="0.01" value={String((form as Record<string, unknown>)[key] || "")} onChange={(e) => set(key as keyof SupplierPerformance, e.target.value)} /></Field>)}</div><div className="grid gap-4 md:grid-cols-3">{["last_order_date", "last_contact_date", "last_price_list_update"].map((key) => <Field key={key} label={({ last_order_date: "تاريخ آخر طلب", last_contact_date: "تاريخ آخر تواصل", last_price_list_update: "آخر تحديث لقائمة الأسعار" } as Record<string, string>)[key]}><Input type="date" value={String((form as Record<string, unknown>)[key] || "")} onChange={(e) => set(key as keyof SupplierPerformance, e.target.value)} /></Field>)}</div><Field label="ملاحظات مستوى الخدمة"><Textarea value={form.service_notes || ""} onChange={(e) => set("service_notes", e.target.value)} /></Field><div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose} type="button">إلغاء</Button><Button disabled={mutation.isPending} type="submit"><Save className="h-4 w-4" />حفظ المؤشرات</Button></div></form></Modal>;
}
