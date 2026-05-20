import { useMemo, useState } from "react";
import { FileDown, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button, Field, Input, Modal } from "../../components/shared/Primitives";
import {
  downloadSupplierReportExcel,
  downloadSupplierReportPdf,
  getSupplierReportPreview,
  type SupplierReportOptions,
  type SupplierReportPreview
} from "../../services/reportService";

function todayInputValue() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function dateOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

const quickRanges = [
  { label: "اليوم", from: todayInputValue(), to: todayInputValue() },
  { label: "آخر 7 أيام", from: dateOffset(-6), to: todayInputValue() },
  { label: "آخر 30 يومًا", from: dateOffset(-29), to: todayInputValue() }
];

export default function SupplierReportModal({ onClose, setMessage }: { onClose: () => void; setMessage: (message: string) => void; }) {
  const [options, setOptions] = useState<SupplierReportOptions>({
    fromDate: todayInputValue(),
    toDate: todayInputValue(),
    status: "",
    category: "",
    region: "",
    includeOnlyAddedDuringPeriod: false,
    hasExpiringDocuments: false
  });
  const [busy, setBusy] = useState<"pdf" | "excel" | null>(null);
  const [error, setError] = useState("");

  const previewQuery = useQuery({
    queryKey: ["supplierReportPreview", options],
    queryFn: () => getSupplierReportPreview(options),
    keepPreviousData: true,
    staleTime: 30_000,
    retry: false
  });

  const summary = previewQuery.data?.data;

  const filterLabel = useMemo(() => {
    const labels = [];
    if (options.status) labels.push(`الحالة: ${options.status}`);
    if (options.category) labels.push(`الفئة: ${options.category}`);
    if (options.region) labels.push(`المنطقة: ${options.region}`);
    if (options.includeOnlyAddedDuringPeriod) labels.push("الموردين المضافين خلال الفترة فقط");
    if (options.hasExpiringDocuments) labels.push("الموردين بمستندات تنتهي خلال الفترة");
    return labels.length > 0 ? labels.join(" · ") : "بدون مرشحات إضافية";
  }, [options]);

  async function runExport(type: "pdf" | "excel") {
    setError("");
    setBusy(type);

    try {
      if (type === "pdf") {
        await downloadSupplierReportPdf(options);
        setMessage("تم تحميل تقرير الموردين التنفيذي بصيغة PDF");
      } else {
        await downloadSupplierReportExcel(options);
        setMessage("تم تحميل تقرير الموردين التنفيذي بصيغة Excel");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحميل التقرير");
    } finally {
      setBusy(null);
    }
  }

  function updateOption<K extends keyof SupplierReportOptions>(key: K, value: SupplierReportOptions[K]) {
    setOptions((current) => ({ ...current, [key]: value }));
  }

  return (
    <Modal title="تصدير تقرير الموردين التنفيذي" onClose={onClose}>
      <div dir="rtl" className="space-y-5">
        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm font-bold text-rose-200">
            {error}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="من تاريخ" required>
            <Input
              type="date"
              value={options.fromDate}
              onChange={(event) => updateOption("fromDate", event.target.value)}
            />
          </Field>
          <Field label="إلى تاريخ" required>
            <Input
              type="date"
              value={options.toDate}
              onChange={(event) => updateOption("toDate", event.target.value)}
            />
          </Field>
        </div>

        <div className="flex flex-wrap gap-2">
          {quickRanges.map((range) => (
            <button
              key={range.label}
              type="button"
              onClick={() => setOptions((current) => ({ ...current, fromDate: range.from, toDate: range.to }))}
              className={`rounded-2xl border px-4 py-2 text-sm font-black transition ${options.fromDate === range.from && options.toDate === range.to ? "border-indigo-500 bg-indigo-500/15 text-indigo-100" : "border-[#3A4560] bg-[#1E2638] text-[#C3CBE0] hover:border-indigo-400 hover:text-white"}`}
            >
              {range.label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Field label="الحالة">
            <Input
              placeholder="نشط، معلق، ..."
              value={options.status}
              onChange={(event) => updateOption("status", event.target.value)}
            />
          </Field>
          <Field label="الفئة">
            <Input
              placeholder="فئة المورد"
              value={options.category}
              onChange={(event) => updateOption("category", event.target.value)}
            />
          </Field>
          <Field label="المنطقة / المدينة">
            <Input
              placeholder="المنطقة أو المدينة"
              value={options.region}
              onChange={(event) => updateOption("region", event.target.value)}
            />
          </Field>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#3A4560] bg-[#1E2638] px-4 py-3 text-sm font-black text-[#F4F7FB] hover:border-indigo-400">
            <input
              type="checkbox"
              checked={options.includeOnlyAddedDuringPeriod}
              onChange={(event) => updateOption("includeOnlyAddedDuringPeriod", event.target.checked)}
              className="h-4 w-4 accent-[#5B73E8]"
            />
            عرض الموردين الذين أضيفوا خلال الفترة فقط
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#3A4560] bg-[#1E2638] px-4 py-3 text-sm font-black text-[#F4F7FB] hover:border-indigo-400">
            <input
              type="checkbox"
              checked={options.hasExpiringDocuments}
              onChange={(event) => updateOption("hasExpiringDocuments", event.target.checked)}
              className="h-4 w-4 accent-[#5B73E8]"
            />
            تضمين الموردين بمستندات تنتهي خلال الفترة
          </label>
        </div>

        <div className="rounded-2xl border border-[#3A4560] bg-[#1E2638] p-4">
          <p className="font-black text-white">ملخص سريع</p>
          <p className="mt-2 text-sm leading-6 text-[#9FB2D9]">{filterLabel}</p>
          {previewQuery.isLoading ? (
            <p className="mt-3 text-sm text-[#8E9AB6]">جارٍ تحميل الملخص...</p>
          ) : previewQuery.isError ? (
            <p className="mt-3 text-sm text-[#fbbf24]">تعذر تحميل الملخص. حاول تغيير المرشح أو تحديث الصفحة.</p>
          ) : summary ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#2F394F] bg-[#172033] p-4">
                <p className="text-sm text-[#9FB2D9]">إجمالي الموردين</p>
                <p className="mt-2 text-2xl font-black text-white">{summary.totalSuppliers}</p>
              </div>
              <div className="rounded-2xl border border-[#2F394F] bg-[#172033] p-4">
                <p className="text-sm text-[#9FB2D9]">موردون نشطون</p>
                <p className="mt-2 text-2xl font-black text-white">{summary.activeSuppliers}</p>
              </div>
              <div className="rounded-2xl border border-[#2F394F] bg-[#172033] p-4">
                <p className="text-sm text-[#9FB2D9]">موردون قيد المتابعة</p>
                <p className="mt-2 text-2xl font-black text-white">{summary.pendingSuppliers}</p>
              </div>
              <div className="rounded-2xl border border-[#2F394F] bg-[#172033] p-4">
                <p className="text-sm text-[#9FB2D9]">مستندات تنتهي خلال الفترة</p>
                <p className="mt-2 text-2xl font-black text-white">{summary.suppliersWithExpiringDocuments}</p>
              </div>
            </div>
          ) : null}
        </div>

        {summary && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#3A4560] bg-[#1F2937] p-4">
              <p className="text-sm text-[#9FB2D9]">أعلى الفئات</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {summary.topCategories.length > 0 ? summary.topCategories.map((item) => (
                  <span key={item.category} className="rounded-full border border-[#334155] bg-[#111827] px-3 py-1 text-xs font-black text-[#E2E8F0]">
                    {item.category} · {item.count}
                  </span>
                )) : (
                  <span className="rounded-full border border-[#334155] bg-[#111827] px-3 py-1 text-xs text-[#9FB2D9]">لا توجد فئات محددة</span>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-[#3A4560] bg-[#1F2937] p-4">
              <p className="text-sm text-[#9FB2D9]">أكثر المناطق</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {summary.topRegions.length > 0 ? summary.topRegions.map((item) => (
                  <span key={item.region} className="rounded-full border border-[#334155] bg-[#111827] px-3 py-1 text-xs font-black text-[#E2E8F0]">
                    {item.region} · {item.count}
                  </span>
                )) : (
                  <span className="rounded-full border border-[#334155] bg-[#111827] px-3 py-1 text-xs text-[#9FB2D9]">لا توجد مناطق محددة</span>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            إغلاق
          </Button>
          <Button type="button" variant="secondary" onClick={() => runExport("excel")} disabled={busy !== null || previewQuery.isLoading}>
            <FileText className="h-4 w-4" />
            {busy === "excel" ? "جاري التصدير..." : "تصدير Excel"}
          </Button>
          <Button type="button" onClick={() => runExport("pdf")} disabled={busy !== null || previewQuery.isLoading}>
            <FileDown className="h-4 w-4" />
            {busy === "pdf" ? "جاري التحميل..." : "تحميل PDF"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
