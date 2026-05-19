import { useMemo, useState } from "react";
import { useEffect } from "react";
import { Link, useSearchParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw, Search, Upload } from "lucide-react";
import { categoryOptions, supplierStatuses } from "../../lib/constants";
import { expiryState, formatDate, parseCategories } from "../../lib/format";
import { canCreateSupplier } from "../../lib/permissions";
import { importSuppliers, listAllDocuments, listSuppliers, previewSupplierImport } from "../../services/supplierService";
import { useAuth } from "../auth/AuthProvider";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import type { Supplier } from "../../types";
import { Button, Card, EmptyState, Input, LoadingState, Select, StatusBadge } from "../../components/shared/Primitives";
import { SupplierFormModal } from "./SupplierFormModal";

const pageSize = 25;

export function SuppliersPage() {
  const { user, setMessage } = useAuth();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Supplier | null | undefined>(undefined);
  const debouncedSearch = useDebouncedValue(search, 250);

  const suppliersQuery = useQuery({ queryKey: ["suppliers"], queryFn: listSuppliers, staleTime: 60_000 });
  const documentsQuery = useQuery({ queryKey: ["documents", "all"], queryFn: listAllDocuments, staleTime: 60_000 });
  const suppliers = suppliersQuery.data || [];
  const documents = documentsQuery.data || [];

  const previewMutation = useMutation({
    mutationFn: previewSupplierImport,
    onSuccess: (result) => {
      const imported = result.importedSuppliers ?? result.imported ?? 0;
      const updated = result.updatedSuppliers ?? result.updated ?? 0;
      const contacts = result.importedContacts ?? result.contactsCreated ?? 0;
      const skippedNoName = result.skippedRows ?? result.skipped ?? 0;
      const errCount =
        (Array.isArray(result.errors) ? result.errors.length : undefined) ??
        (Array.isArray(result.failedRows) ? result.failedRows.length : undefined) ??
        result.failed ??
        0;
      setMessage(
        `معاينة الملف: ${result.totalRows} صف؛ موردون جدد ${imported}، تحديث ${updated}، جهات اتصال جديدة ${contacts}، بدون اسم ${skippedNoName}، صفوف ناقص جوال ${result.missingPhone}، صفوف ناقص بريد ${result.missingEmail}، ناقصة بيانات ${result.incomplete}، أخطاء ${errCount}`
      );
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "فشلت معاينة ملف الموردين"),
  });

  const importMutation = useMutation({
    mutationFn: importSuppliers,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      const imported = result.importedSuppliers ?? result.imported ?? 0;
      const updated = result.updatedSuppliers ?? result.updated ?? 0;
      const contacts = result.importedContacts ?? result.contactsCreated ?? 0;
      const skippedNoName = result.skippedRows ?? result.skipped ?? 0;
      const errCount =
        (Array.isArray(result.errors) ? result.errors.length : undefined) ??
        (Array.isArray(result.failedRows) ? result.failedRows.length : undefined) ??
        result.failed ??
        0;
      setMessage(
        `نتيجة الاستيراد: موردون جدد ${imported}، تحديث ${updated}، جهات اتصال جديدة ${contacts}، بدون اسم ${skippedNoName}، صفوف ناقص جوال ${result.missingPhone}، صفوف ناقص بريد ${result.missingEmail}، ناقصة بيانات ${result.incomplete}، أخطاء ${errCount}`
      );
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "فشل رفع ملف الموردين"),
  });

  function validateImportFile(file: File) {
    const lowerName = file.name.toLowerCase();

    if (!lowerName.endsWith(".xlsx") && !lowerName.endsWith(".csv")) {
      setMessage("ارفع ملف Excel بصيغة xlsx أو ملف CSV UTF-8");
      return false;
    }

    return true;
  }

  function handlePreviewFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;
    if (!validateImportFile(file)) return;

    previewMutation.mutate(file);
  }

  function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;
    if (!validateImportFile(file)) return;

    const confirmed = window.confirm(
      "سيتم رفع الملف وتعديل قاعدة البيانات. هل أنت متأكد؟"
    );

    if (!confirmed) return;

    importMutation.mutate(file);
  }

  const filtered = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();

    return suppliers.filter((supplier) => {
      const categories = parseCategories(supplier.category);
      const haystack = [supplier.supplier_code, supplier.name_ar, supplier.name_en, supplier.city, supplier.cr_number, supplier.vat_number, ...categories]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (!term || haystack.includes(term)) &&
        (status === "all" || supplier.status === status) &&
        (category === "all" || categories.includes(category))
      );
    });
  }, [suppliers, debouncedSearch, status, category]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const hasRows = rows.length > 0;

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const documentRiskBySupplier = useMemo(() => {
    const importantTypes = new Set(["CR", "VAT", "Authorization", "Price List"]);
    const risk = new Map<string, "danger" | "warning">();

    for (const document of documents) {
      if (!importantTypes.has(document.type)) continue;
      const state = expiryState(document.expiry_date);
      if (state.tone === "danger") {
        risk.set(document.supplier_id, "danger");
      } else if (state.tone === "warning" && risk.get(document.supplier_id) !== "danger") {
        risk.set(document.supplier_id, "warning");
      }
    }

    return risk;
  }, [documents]);

  async function refreshSuppliers() {
    try {
      await Promise.all([suppliersQuery.refetch(), documentsQuery.refetch()]);
      setMessage("تم تحديث بيانات الموردين");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "فشل تحديث بيانات الموردين");
    }
  }

  return (
    <div className="space-y-6">
      {editing !== undefined && <SupplierFormModal supplier={editing || null} onClose={() => setEditing(undefined)} />}

      <Card className="p-5">
        <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                className="pr-9"
                placeholder="بحث باسم المورد أو السجل أو التصنيف"
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
              <option value="all">كل الحالات</option>
              {supplierStatuses.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </Select>

            <Select
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">كل التصنيفات</option>
              {categoryOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={refreshSuppliers} disabled={suppliersQuery.isFetching || documentsQuery.isFetching}>
              <RefreshCw className={`h-4 w-4 ${(suppliersQuery.isFetching || documentsQuery.isFetching) ? "animate-spin" : ""}`} />
              {(suppliersQuery.isFetching || documentsQuery.isFetching) ? "جاري التحديث..." : "تحديث"}
            </Button>

            {canCreateSupplier(user?.role) && (
              <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-bold text-slate-100 transition hover:bg-slate-700">
                <Search className="h-4 w-4" />
                {previewMutation.isPending ? "جاري المعاينة..." : "معاينة ملف Excel"}
                <input
                  type="file"
                  accept=".xlsx,.csv"
                  onChange={handlePreviewFile}
                  disabled={previewMutation.isPending || importMutation.isPending}
                  className="hidden"
                />
              </label>
            )}

            {canCreateSupplier(user?.role) && (
              <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-bold text-slate-100 transition hover:bg-slate-700">
                <Upload className="h-4 w-4" />
                {importMutation.isPending ? "جاري رفع الملف..." : "رفع ملف Excel"}
                <input
                  type="file"
                  accept=".xlsx,.csv"
                  onChange={handleImportFile}
                  disabled={previewMutation.isPending || importMutation.isPending}
                  className="hidden"
                />
              </label>
            )}

            {canCreateSupplier(user?.role) && (
              <Button onClick={() => setEditing(null)}>
                <Plus className="h-4 w-4" />
                إضافة مورد
              </Button>
            )}
          </div>
        </div>
      </Card>

      {hasRows && (
        <div className="grid w-full min-w-0 gap-3 md:hidden">
          {rows.map((supplier) => (
            <Link
              key={supplier.id}
              to={`/suppliers/${supplier.id}`}
              className="block w-full min-w-0 overflow-hidden rounded-2xl border border-[#373E55] bg-[#292F40] p-4 text-right shadow-[0_12px_32px_rgba(10,14,25,0.20)] transition hover:-translate-y-0.5 hover:border-[#556EE6]/50 hover:bg-[#343B52]"
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0 flex-1 text-right">
                  <h2 className="truncate text-base font-black text-white">{supplier.name_ar || supplier.name_en || "-"}</h2>
                  <p className="mt-1 truncate text-xs font-black text-[#8EA0FF]">معرف المورد: <span dir="ltr">{supplier.supplier_code || "غير محدد"}</span></p>
                  {supplier.name_en && <p className="mt-1 truncate text-right text-xs text-[#8F99B8]">{supplier.name_en}</p>}
                </div>
                <div className="shrink-0">
                  <StatusBadge status={supplier.status} />
                </div>
              </div>

              {documentRiskBySupplier.get(supplier.id) && (
                <div className={`mt-3 rounded-lg border px-3 py-2 text-xs font-bold ${
                  documentRiskBySupplier.get(supplier.id) === "danger"
                    ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-200"
                }`}>
                  {documentRiskBySupplier.get(supplier.id) === "danger" ? "تنبيه: مستند مهم منتهي" : "تنبيه: مستند مهم ينتهي قريبًا"}
                </div>
              )}

              <div className="mt-4 grid min-w-0 grid-cols-2 gap-3 text-sm">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#8F99B8]">التقييم</p>
                  <p className="mt-1 truncate font-black text-[#F3F6F9]">{supplierRating(supplier)}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#8F99B8]">آخر تحديث</p>
                  <p className="mt-1 truncate font-black text-[#F3F6F9]">{formatDate(supplier.updated_at || supplier.created_at)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!hasRows && (
        <Card className="overflow-hidden md:hidden">
          {suppliersQuery.isLoading ? (
            <LoadingState label="جاري تحميل الموردين..." />
          ) : suppliersQuery.error ? (
            <EmptyState title="فشل تحميل الموردين" subtitle="تحقق من اتصال الخادم ثم حاول مرة أخرى." />
          ) : (
            <EmptyState title={suppliers.length ? "لا توجد نتائج مطابقة" : "لا توجد بيانات موردين"} />
          )}
        </Card>
      )}

      <Card className="hidden overflow-hidden md:block">
        {suppliersQuery.isLoading ? (
          <LoadingState label="جاري تحميل الموردين..." />
        ) : suppliersQuery.error ? (
          <EmptyState title="فشل تحميل الموردين" subtitle="تحقق من اتصال الخادم ثم حاول مرة أخرى." />
        ) : rows.length === 0 ? (
          <EmptyState title={suppliers.length ? "لا توجد نتائج مطابقة" : "لا توجد بيانات موردين"} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed bg-[#292F40] text-right text-sm">
              <thead className="bg-[#252B3A] text-[#B8C1DD]">
                <tr>
                  <th className="w-[30%] px-4 py-4 font-black text-right">اسم المورد</th>
                  <th className="w-[14%] px-4 py-4 font-black text-center">المدينة</th>
                  <th className="w-[14%] px-4 py-4 font-black text-center">الحالة</th>
                  <th className="w-[14%] px-4 py-4 font-black text-center">آخر تحديث</th>
                  <th className="w-[10%] px-4 py-4 font-black text-center">التقييم</th>
                  <th className="w-[18%] px-4 py-4 font-black text-center">التنبيهات</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#30364A] bg-[#292F40]">
                {rows.map((supplier) => (
                  <tr
                    key={supplier.id}
                    onClick={() => { window.location.href = `/suppliers/${supplier.id}`; }}
                    className="group cursor-pointer bg-[#292F40] align-middle hover:bg-[#343B52] [&>td]:align-middle [&>td]:transition-colors [&>td]:group-hover:bg-[#343B52]"
                  >
                    <td className="px-4 py-4 text-right align-middle">
                      <p className="truncate font-black text-white">{supplier.name_ar || supplier.name_en || "-"}</p>
                      <p className="truncate text-xs font-black text-[#8EA0FF]">معرف المورد: <span dir="ltr">{supplier.supplier_code || "غير محدد"}</span></p>
                      <p className="truncate text-right text-xs text-[#8F99B8]">{supplier.name_en || "-"}</p>
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-center text-[#B8C1DD]">
                      {supplier.city || "-"}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-center align-middle">
                      <div className="flex items-center justify-center">
                        <StatusBadge status={supplier.status} />
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-center align-middle text-[#B8C1DD]">
                      {formatDate(supplier.updated_at || supplier.created_at)}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-center text-[#B8C1DD]">
                      {(() => {
                        const rating = (supplier as Record<string, unknown>).rating || (supplier as Record<string, unknown>).score;
                        return rating ? String(rating) : "-";
                      })()}
                    </td>

                    <td className="px-4 py-4 text-center align-middle text-[#B8C1DD]">
                      {documentRiskBySupplier.get(supplier.id) ? (
                        <span className={`rounded-full border px-2 py-1 text-xs font-bold ${
                          documentRiskBySupplier.get(supplier.id) === "danger"
                            ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-200"
                        }`}>
                          {documentRiskBySupplier.get(supplier.id) === "danger" ? "مستند منتهي" : "قريب الانتهاء"}
                        </span>
                      ) : parseCategories(supplier.category).length ? (
                        <div className="flex flex-wrap justify-center gap-1">
                          {parseCategories(supplier.category).slice(0, 2).map((category) => (
                            <span key={category} className="rounded-full border border-[#373E55] bg-[#242A39] px-2 py-1 text-xs text-[#B8C1DD]">
                              {category}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[#8F99B8]">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-[#30364A] px-3 py-4 text-sm text-[#8F99B8]">
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

      {hasRows && (
        <div className="flex items-center justify-between rounded-2xl border border-[#373E55] bg-[#292F40] px-4 py-3 text-sm text-[#8F99B8] shadow-[0_12px_32px_rgba(10,14,25,0.18)] md:hidden">
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
      )}
    </div>
  );
}

function supplierRating(supplier: Supplier) {
  const values = supplier as Supplier & {
    rating?: string | number | null;
    internal_rating?: string | number | null;
    average_rating?: string | number | null;
  };

  return values.rating ?? values.internal_rating ?? values.average_rating ?? "-";
}







