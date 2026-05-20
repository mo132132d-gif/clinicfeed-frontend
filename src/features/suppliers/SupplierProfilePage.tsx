import { FormEvent, useState } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Archive, ArrowRight, Copy, Download, Edit2, ExternalLink, MapPinned, Plus, Save, Trash2, Upload } from "lucide-react";
import { CircleMarker, MapContainer, TileLayer } from "react-leaflet";
import { allowedFileExtensions, contractStatuses, documentTypes, maxFileSize } from "../../lib/constants";
import { canArchiveSuppliers, canEditPerformance, canManageSuppliers, canUploadFiles } from "../../lib/permissions";
import { documentTypeLabel, expiryState, formatCurrency, formatDate, formatDateTime, formatNumber, parseCategories, percentage, serviceScoreLabel } from "../../lib/format";
import { getGoogleMapsPreviewUrl, parseLocationInput } from "../../lib/location";
import {
  archiveSupplier,
  createContact,
  createContract,
  createDocument,
  deleteContact,
  deleteDocument,
  getSupplier,
  getSupplierPerformance,
  listContacts,
  listContracts,
  listDocuments,
  listSupplierActivity,
  markPrimaryContact,
  permanentlyDeleteSupplier,
  updateContact,
  updateContract,
  updateDocument,
  updateSupplierPerformance,
} from "../../services/supplierService";
import { useAuth } from "../auth/AuthProvider";
import type { Contact, Contract, Supplier, SupplierDocument, SupplierPerformance } from "../../types";
import { Button, Card, EmptyState, ExpiryBadge, Field, Input, LoadingState, Modal, Select, StatusBadge, Textarea } from "../../components/shared/Primitives";
import { PhoneNumberInput } from "../../components/shared/PhoneNumberInput";
import { SupplierFormModal } from "./SupplierFormModal";

type Tab = "overview" | "contacts" | "documents" | "activity" | "performance";

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

function documentRisk(documents: SupplierDocument[]) {
  const importantTypes = new Set(["CR", "VAT", "Authorization", "Price List"]);
  const importantDocuments = documents.filter((document) => importantTypes.has(document.type));

  if (importantDocuments.some((document) => expiryState(document.expiry_date).tone === "danger")) {
    return { tone: "danger" as const, label: "يوجد مستند مهم منتهي" };
  }

  if (importantDocuments.some((document) => expiryState(document.expiry_date).tone === "warning")) {
    return { tone: "warning" as const, label: "يوجد مستند مهم ينتهي قريبًا" };
  }

  return null;
}

function coordinate(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function supplierMapPosition(supplier?: { latitude?: unknown; longitude?: unknown; google_maps_url?: unknown } | null): [number, number] | null {
  const latitude = coordinate(supplier?.latitude);
  const longitude = coordinate(supplier?.longitude);

  if (latitude !== null && longitude !== null) {
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
    return [latitude, longitude];
  }

  if (typeof supplier?.google_maps_url === 'string') {
    try {
      const parsed = parseLocationInput(supplier.google_maps_url);
      if (parsed) {
        return [parsed.latitude, parsed.longitude];
      }
    } catch {
      return null;
    }
  }

  return null;
}

function supplierAddressSummary(supplier: {
  address?: string | null;
  district?: string | null;
  region?: string | null;
  city?: string | null;
  country?: string | null;
}) {
  return [supplier.address, supplier.district, supplier.region, supplier.city, supplier.country].filter(Boolean).join("، ");
}

export function SupplierProfilePage() {
  const { id = "" } = useParams();
  const { user, setMessage } = useAuth();
  const navigate = useNavigate();
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
  const risk = documentRisk(documents);

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

  const permanentDeleteMutation = useMutation({
    mutationFn: permanentlyDeleteSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
      setMessage("تم حذف المورد نهائيًا");
      navigate("/suppliers");
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "فشل الحذف النهائي"),
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier", id, "documents"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setMessage("تم حذف المستند");
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "فشل حذف المستند"),
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

  function confirmPermanentDeleteSupplier() {
    if (!canManageSuppliers(user?.role)) {
      setMessage("ليس لديك صلاحية لتنفيذ هذا الإجراء");
      return;
    }

    if (window.confirm("سيتم حذف المورد نهائيًا من المنصة ولا يمكن التراجع. هل أنت متأكد؟")) {
      permanentDeleteMutation.mutate(id);
    }
  }

  const profileTabs: Array<{ key: Tab; label: string }> = [
    { key: "overview", label: "نظرة عامة" },
    { key: "contacts", label: "جهات الاتصال" },
    { key: "documents", label: "المستندات" },
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

      <Link to="/suppliers" className="inline-flex items-center gap-2 text-sm font-bold text-[#B8C1DD] transition hover:text-[#F3F6F9]">
        <ArrowRight className="h-4 w-4" />
        العودة إلى الموردين
      </Link>

      <Card className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="text-right">
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0">
                <h1 className="truncate text-3xl font-black text-white">{supplier.name_ar}</h1>
                <p className="mt-2 truncate text-right text-[#8F99B8]">{supplier.name_en || "-"}</p>
              </div>
              <StatusBadge status={supplier.status} />
              {risk && (
                <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-black ${
                  risk.tone === "danger"
                    ? "border-rose-500/30 bg-rose-500/15 text-rose-200"
                    : "border-amber-500/30 bg-amber-500/15 text-amber-200"
                }`}>
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {risk.label}
                </span>
              )}
            </div>
            <p className="mt-3 text-sm text-[#B8C1DD]">معرف المورد: <span dir="ltr">{supplier.supplier_code || "غير محدد"}</span></p>
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

                {canManageSuppliers(user?.role) && (
                  <Button variant="danger" onClick={confirmPermanentDeleteSupplier} disabled={permanentDeleteMutation.isPending}>
                    <Trash2 className="h-4 w-4" />
                    حذف نهائي
                  </Button>
                )}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
            <Info label="المدينة" value={supplier.city} />
            <Info label="السجل التجاري" value={supplier.cr_number} ltr />
            <Info label="الرقم الضريبي" value={supplier.vat_number} ltr />
            <Info label="التصنيفات" value={parseCategories(supplier.categories ?? supplier.category).join(", ")} />
            <Info label="آخر تحديث" value={formatDate(supplier.updated_at || supplier.created_at)} />
          </div>
        </div>
      </Card>

      <div className="overflow-x-auto">
        <div className="inline-flex min-w-max gap-2 rounded-2xl border border-[#373E55] bg-[#242A39] p-2 shadow-inner shadow-black/10">
          {profileTabs.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`rounded-xl px-4 py-2 text-sm font-black transition ${tab === item.key ? "bg-[#556EE6] text-white shadow-[0_10px_24px_rgba(85,110,230,0.22)]" : "text-[#B8C1DD] hover:bg-[#343B52] hover:text-[#F3F6F9]"}`}
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
              <InfoBlock label="العنوان" value={supplierAddressSummary(supplier) || supplier.city} />
              <InfoBlock label="الموقع الإلكتروني" value="-" />
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="mb-4 text-lg font-black text-white">الملاحظات</h2>
            <p className="min-h-32 rounded-xl border border-[#373E55] bg-[#242A39] p-4 text-[#B8C1DD]">{supplier.notes || "لا توجد ملاحظات"}</p>
          </Card>
          <SupplierLocationCard supplier={supplier} />
        </div>
      )}

      {tab === "contacts" && (
        <TableCard title="جهات الاتصال" action={canManageSuppliers(user?.role) ? <Button onClick={() => setModal("contact")}><Plus className="h-4 w-4" />إضافة</Button> : null}>
          {contacts.length === 0 ? <EmptyState title="لا توجد جهات تواصل لهذا المورد" /> : (
            <table className="min-w-[900px] text-right text-sm">
              <thead className="bg-[#252B3A] text-[#B8C1DD]"><tr>{["الاسم", "المنصب", "البريد الإلكتروني", "رقم الجوال", "أساسي", "الإجراءات"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-[#30364A]">{contacts.map((contact) => (
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
        <TableCard
          title="المستندات"
          action={canUploadFiles(user?.role) ? (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setModal("document")}><Upload className="h-4 w-4" />رفع مستند</Button>
              <Button variant="secondary" onClick={() => setModal("contract")}><Upload className="h-4 w-4" />إضافة عقد</Button>
            </div>
          ) : null}
        >
          <DocumentsTable
            documents={documents}
            contracts={contracts}
            onEdit={(item) => { setEditingDocument(item); setModal("document"); }}
            onDelete={(item) => {
              if (window.confirm("هل تريد حذف هذا المستند؟")) deleteDocumentMutation.mutate(item.id);
            }}
            onEditContract={(item) => { setEditingContract(item); setModal("contract"); }}
            canEdit={canUploadFiles(user?.role)}
            deletePending={deleteDocumentMutation.isPending}
          />
        </TableCard>
      )}

      {tab === "activity" && (
        <Card className="p-5">
          <h2 className="text-lg font-black text-white">النشاط</h2>
          {(activityQuery.data || []).length === 0 ? <EmptyState title="لا توجد سجلات نشاط متاحة حاليًا" /> : (
            <div className="mt-5 space-y-4">
              {(activityQuery.data || []).map((item) => (
                <div key={item.id} className="border-r-2 border-[#556EE6] pr-4">
                  <p className="font-bold text-white">{item.action}</p>
                  <p className="text-sm text-[#8F99B8]">{item.entity_type} · {formatDateTime(item.created_at)}</p>
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
                <p className="text-sm text-[#8F99B8]">{label}</p>
                <p className="mt-2 text-2xl font-black text-white">{value}</p>
              </Card>
            ))}
          </div>
          <Card className="p-5">
            <h2 className="text-lg font-black text-white">ملاحظات مستوى الخدمة</h2>
            <p className="mt-3 rounded-xl border border-[#373E55] bg-[#242A39] p-4 text-[#B8C1DD]">{performance?.service_notes || "لا توجد ملاحظات"}</p>
          </Card>
        </div>
      )}
    </div>
  );
}

function SupplierLocationCard({ supplier }: { supplier: Supplier }) {
  const position = supplierMapPosition(supplier);
  const address = supplierAddressSummary(supplier);

  return (
    <Card className="p-5 xl:col-span-2">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <MapPinned className="h-5 w-5 text-[#9FB2FF]" />
            <h2 className="text-lg font-black text-white">موقع المورد</h2>
          </div>
          <p className="mt-2 text-sm leading-7 text-[#B8C1DD]">
            {address || "لا توجد بيانات عنوان محفوظة لهذا المورد"}
          </p>
        </div>

        {(() => {
          const previewUrl = supplier.google_maps_url
            ? getGoogleMapsPreviewUrl(supplier.google_maps_url)
            : supplierMapPosition(supplier)
            ? getGoogleMapsPreviewUrl(`${supplier.latitude},${supplier.longitude}`)
            : null;

          if (!previewUrl) return null;

          return (
            <Button
              variant="secondary"
              onClick={() => window.open(previewUrl, "_blank", "noopener,noreferrer")}
            >
              <ExternalLink className="h-4 w-4" />
              فتح في Google Maps
            </Button>
          );
        })()}
      </div>

      {position ? (
        <div className="clinicfeed-map h-72 overflow-hidden rounded-2xl border border-[#373E55]">
          <MapContainer center={position} zoom={13} scrollWheelZoom={false} className="h-full w-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <CircleMarker
              center={position}
              radius={10}
              pathOptions={{ color: "#C8D2FF", fillColor: "#5B73E8", fillOpacity: 0.9, weight: 2 }}
            />
          </MapContainer>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#3A4560] bg-[#242A39] p-6 text-center text-sm font-bold text-[#8E9AB6]">
          لم يتم تحديد موقع المورد على الخريطة بعد
        </div>
      )}
    </Card>
  );
}

function Info({ label, value, ltr = false }: { label: string; value?: string | null; ltr?: boolean }) {
  return <div className="rounded-xl border border-[#373E55] bg-[#242A39] p-3"><p className="text-xs text-[#8F99B8]">{label}</p><p className="mt-1 font-bold text-[#F3F6F9]" dir={ltr ? "ltr" : "rtl"}>{value || "غير محدد"}</p></div>;
}

function InfoBlock({ label, value }: { label: string; value?: ReactNode }) {
  return <div className="rounded-xl border border-[#373E55] bg-[#242A39] p-4"><p className="text-sm text-[#8F99B8]">{label}</p><p className="mt-2 font-bold text-[#F3F6F9]">{value || "غير محدد"}</p></div>;
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
  return <Card className="overflow-hidden"><div className="flex items-center justify-between border-b border-[#30364A] bg-[#252B3A]/45 p-5"><h2 className="text-lg font-black text-white">{title}</h2>{action}</div><div className="overflow-x-auto">{children}</div></Card>;
}

function DocumentsTable({
  documents,
  contracts,
  onEdit,
  onDelete,
  onEditContract,
  canEdit,
  deletePending,
}: {
  documents: SupplierDocument[];
  contracts: Contract[];
  onEdit: (document: SupplierDocument) => void;
  onDelete: (document: SupplierDocument) => void;
  onEditContract: (contract: Contract) => void;
  canEdit: boolean;
  deletePending: boolean;
}) {
  if (documents.length === 0 && contracts.length === 0) return <EmptyState title="لا توجد مستندات لهذا المورد" />;
  return (
    <table className="min-w-[1000px] text-right text-sm">
      <thead className="bg-[#252B3A] text-[#B8C1DD]">
        <tr>{["نوع الملف", "تاريخ الانتهاء", "تاريخ الإصدار / الرفع", "الحالة", "الملف", "الإجراءات"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
      </thead>
      <tbody className="divide-y divide-[#30364A]">
        {documents.map((document) => (
          <tr key={`document-${document.id}`}>
            <td className="whitespace-nowrap px-4 py-3 font-bold text-white">{documentTypeLabel(document.type)}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-400">{formatDate(document.expiry_date)}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-400">{formatDate(document.issue_date || document.last_updated || document.created_at)}</td>
            <td className="whitespace-nowrap px-4 py-3"><ExpiryBadge date={document.expiry_date} /></td>
            <td className="whitespace-nowrap px-4 py-3"><FileActions url={document.file_url} /></td>
            <td className="whitespace-nowrap px-4 py-3">
              {canEdit && (
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => onEdit(document)}><Edit2 className="h-4 w-4" /></Button>
                  <Button variant="danger" onClick={() => onDelete(document)} disabled={deletePending}><Trash2 className="h-4 w-4" /></Button>
                </div>
              )}
            </td>
          </tr>
        ))}
        {contracts.map((contract) => (
          <tr key={`contract-${contract.id}`}>
            <td className="whitespace-nowrap px-4 py-3 font-bold text-white">عقد: {contract.contract_number}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-400">{formatDate(contract.end_date)}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-400">{formatDate(contract.start_date)}</td>
            <td className="whitespace-nowrap px-4 py-3"><ExpiryBadge date={contract.end_date} /></td>
            <td className="whitespace-nowrap px-4 py-3"><FileActions url={contract.file_url} /></td>
            <td className="whitespace-nowrap px-4 py-3">{canEdit && <Button variant="secondary" onClick={() => onEditContract(contract)}><Edit2 className="h-4 w-4" /></Button>}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
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
  return (
    <Modal title={contact ? "تعديل جهة اتصال" : "إضافة جهة اتصال"} onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="الاسم" required><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
          <Field label="المنصب"><Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></Field>
          <Field label="البريد الإلكتروني"><Input dir="ltr" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="رقم الجوال"><PhoneNumberInput value={form.phone} onChange={(phone) => setForm({ ...form, phone })} /></Field>
          <Field label="واتساب"><PhoneNumberInput value={form.whatsapp} onChange={(whatsapp) => setForm({ ...form, whatsapp })} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-200"><input type="checkbox" checked={form.is_primary} onChange={(e) => setForm({ ...form, is_primary: e.target.checked })} /> جهة تواصل أساسية</label>
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose} type="button">إلغاء</Button><Button disabled={mutation.isPending} type="submit">حفظ</Button></div>
      </form>
    </Modal>
  );
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
  const [form, setForm] = useState({ type: document?.type || "CR", expiry_date: formatDate(document?.expiry_date) === "-" ? "" : formatDate(document?.expiry_date), last_updated: formatDate(document?.issue_date || document?.last_updated) === "-" ? "" : formatDate(document?.issue_date || document?.last_updated) });
  const mutation = useMutation({ mutationFn: () => document ? updateDocument(document.id, form, file) : createDocument(supplierId, form, file), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["supplier", supplierId, "documents"] }); setMessage("تم حفظ المستند بنجاح"); onClose(); }, onError: () => { setError("فشل رفع الملف"); setMessage("فشل رفع الملف"); } });
  function submit(event: FormEvent) {
    event.preventDefault();
    const err = fileValidation(file);
    if (err) return setError(err);
    if (!form.expiry_date) return setError("تاريخ انتهاء المستند مطلوب");
    if (!document && !file) return setError("الملف مطلوب");
    mutation.mutate();
  }
  return <Modal title={document ? "تعديل مستند" : "رفع مستند"} onClose={onClose}><form className="space-y-4" onSubmit={submit}>{error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-200">{error}</div>}<div className="grid gap-4 md:grid-cols-2"><Field label="نوع المستند" required><Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as SupplierDocument["type"] })}>{documentTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select></Field><Field label="تاريخ الانتهاء" required><Input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} required /></Field><Field label="تاريخ الإصدار"><Input type="date" value={form.last_updated} onChange={(e) => setForm({ ...form, last_updated: e.target.value })} /></Field><Field label="ملف المستند"><Input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" onChange={(e) => setFile(e.target.files?.[0] || null)} />{file && <p className="mt-2 text-xs text-slate-400">{file.name}</p>}</Field></div><div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose} type="button">إلغاء</Button><Button disabled={mutation.isPending} type="submit">{mutation.isPending ? "جاري الرفع..." : "حفظ"}</Button></div></form></Modal>;
}

function PerformanceModal({ supplierId, performance, onClose }: { supplierId: string; performance?: SupplierPerformance | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SupplierPerformance>({ ...emptyPerformance(), ...(performance || {}) });
  const mutation = useMutation({ mutationFn: () => updateSupplierPerformance(supplierId, form), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["supplier", supplierId, "performance"] }); queryClient.invalidateQueries({ queryKey: ["supplier-performance"] }); onClose(); } });
  const set = (key: keyof SupplierPerformance, value: string) => setForm((current) => ({ ...current, [key]: value }));
  return <Modal title="تعديل مؤشرات المورد" onClose={onClose}><form className="space-y-4" onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}><div className="grid gap-4 md:grid-cols-3">{["total_orders", "fulfilled_orders", "cancelled_orders", "total_order_value", "supplier_revenue", "supplier_balance", "average_response_time", "price_accuracy_score", "product_availability_score", "delivery_commitment_score", "response_speed_score"].map((key) => <Field key={key} label={({ total_orders: "إجمالي الطلبات", fulfilled_orders: "الطلبات المنفذة", cancelled_orders: "الطلبات الملغاة", total_order_value: "إجمالي قيمة الطلبات", supplier_revenue: "إيرادات المورد", supplier_balance: "رصيد المورد", average_response_time: "متوسط سرعة الرد", price_accuracy_score: "تقييم دقة الأسعار", product_availability_score: "تقييم توفر المنتجات", delivery_commitment_score: "تقييم الالتزام بالتسليم", response_speed_score: "تقييم سرعة الاستجابة" } as Record<string, string>)[key]}><Input type="number" min="0" step="0.01" value={String((form as Record<string, unknown>)[key] || "")} onChange={(e) => set(key as keyof SupplierPerformance, e.target.value)} /></Field>)}</div><div className="grid gap-4 md:grid-cols-3">{["last_order_date", "last_contact_date", "last_price_list_update"].map((key) => <Field key={key} label={({ last_order_date: "تاريخ آخر طلب", last_contact_date: "تاريخ آخر تواصل", last_price_list_update: "آخر تحديث لقائمة الأسعار" } as Record<string, string>)[key]}><Input type="date" value={String((form as Record<string, unknown>)[key] || "")} onChange={(e) => set(key as keyof SupplierPerformance, e.target.value)} /></Field>)}</div><Field label="ملاحظات مستوى الخدمة"><Textarea value={form.service_notes || ""} onChange={(e) => set("service_notes", e.target.value)} /></Field><div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose} type="button">إلغاء</Button><Button disabled={mutation.isPending} type="submit"><Save className="h-4 w-4" />حفظ المؤشرات</Button></div></form></Modal>;
}
