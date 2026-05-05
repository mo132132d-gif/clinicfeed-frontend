import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Edit2, Eye, Plus, RefreshCw, Search, Upload } from "lucide-react";
import { categoryOptions, supplierStatuses } from "../../lib/constants";
import { formatDate, parseCategories } from "../../lib/format";
import { canArchiveSuppliers, canCreateSupplier, canManageSuppliers } from "../../lib/permissions";
import { archiveSupplier, importSuppliers, listSuppliers, previewSupplierImport } from "../../services/supplierService";
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
  const suppliers = suppliersQuery.data || [];

  const archiveMutation = useMutation({
    mutationFn: archiveSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setMessage("تمت أرشفة المورد");
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "فشلت الأرشفة"),
  });

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
      const haystack = [supplier.name_ar, supplier.name_en, supplier.city, supplier.cr_number, supplier.vat_number, ...categories]
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

  function confirmArchive(supplier: Supplier) {
    if (!canArchiveSuppliers(user?.role)) {
      setMessage("ليس لديك صلاحية لتنفيذ هذا الإجراء");
      return;
    }

    if (window.confirm(`هل تريد أرشفة المورد: ${supplier.name_ar}؟`)) {
      archiveMutation.mutate(supplier.id);
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
            <Button variant="secondary" onClick={() => queryClient.invalidateQueries({ queryKey: ["suppliers"] })}>
              <RefreshCw className="h-4 w-4" />
              تحديث
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
        <div className="grid gap-3 md:hidden">
          {rows.map((supplier) => (
            <Link
              key={supplier.id}
              to={`/suppliers/${supplier.id}`}
              className="rounded-xl border border-slate-800 bg-[#111827] p-4 shadow-sm transition hover:border-blue-700"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-black text-white">{supplier.name_ar || supplier.name_en || "-"}</h2>
                  {supplier.name_en && <p className="mt-1 truncate text-xs text-slate-500" dir="ltr">{supplier.name_en}</p>}
                </div>
                <StatusBadge status={supplier.status} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs font-bold text-slate-500">التقييم</p>
                  <p className="mt-1 font-black text-slate-100">{supplierRating(supplier)}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500">آخر تحديث</p>
                  <p className="mt-1 font-black text-slate-100">{formatDate(supplier.updated_at || supplier.created_at)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Card className={hasRows ? "hidden overflow-hidden md:block" : "overflow-hidden"}>
        {suppliersQuery.isLoading ? (
          <LoadingState label="جاري تحميل الموردين..." />
        ) : suppliersQuery.error ? (
          <EmptyState title="فشل تحميل الموردين" subtitle="تحقق من اتصال الخادم ثم حاول مرة أخرى." />
        ) : rows.length === 0 ? (
          <EmptyState title={suppliers.length ? "لا توجد نتائج مطابقة" : "لا توجد بيانات موردين"} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] table-auto bg-slate-950 text-right text-sm">
              <thead className="bg-[#050B18] text-slate-300">
                <tr>
                  <th className="min-w-[900px] px-5 py-4 font-black text-center">اسم المورد</th>
                  <th className="min-w-[900px] px-5 py-4 font-black text-center">الحالة</th>
                  <th className="min-w-[900px] px-5 py-4 font-black text-center">آخر تحديث</th>
                  <th className="min-w-[900px] px-5 py-4 text-center font-black">التقييم</th>
                  <th className="min-w-[900px] px-5 py-4 font-black text-center">التصنيفات</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800 bg-slate-950">
                {rows.map((supplier) => (
                  <tr key={supplier.id} onClick={() => { window.location.href = `/suppliers/${supplier.id}`; }} className="group cursor-pointer bg-slate-950 hover:bg-slate-900/70 [&>td]:transition-colors [&>td]:group-hover:bg-slate-900/70">
                    <td className="whitespace-nowrap px-5 py-4">
                      <p className="font-black text-blue-200 underline-offset-4 group-hover:underline">{supplier.name_ar || supplier.name_en || "-"}</p>
                      <p className="truncate text-xs text-slate-500" dir="ltr">{supplier.name_en || "-"}</p>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <StatusBadge status={supplier.status} />
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-slate-400">-</td>

                    <td className="whitespace-nowrap px-5 py-4 text-slate-400">
                      {formatDate(supplier.updated_at || supplier.created_at)}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-slate-400">-</td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="flex flex-nowrap gap-2">
                        {parseCategories(supplier.category).length === 0 ? (
                          <span className="text-slate-500">-</span>
                        ) : (
                          parseCategories(supplier.category).map((item) => (
                            <span key={item} className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-200">
                              {item}
                            </span>
                          ))
                        )}
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

      {hasRows && (
        <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#111827] px-4 py-3 text-sm text-slate-400 md:hidden">
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





