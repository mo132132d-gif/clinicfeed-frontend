import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, BarChart3, Clock, FileWarning, PackageCheck, TrendingDown, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { listActivity } from "../../services/activityService";
import { listSupplierPerformance, listSuppliers } from "../../services/supplierService";
import { Card, EmptyState, LoadingState } from "../../components/shared/Primitives";
import { formatCurrency, formatDateTime, formatNumber, percentage, serviceScoreLabel } from "../../lib/format";

function sameDate(value: string | undefined, mode: "today" | "week" | "month") {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  if (mode === "today") return date.toDateString() === now.toDateString();
  if (mode === "month") return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  const start = new Date(now);
  start.setDate(now.getDate() - 7);
  return date >= start && date <= now;
}

function olderThanDays(value: string | undefined | null, days: number) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return date < cutoff;
}

export function DashboardPage() {
  const suppliersQuery = useQuery({ queryKey: ["suppliers"], queryFn: listSuppliers, staleTime: 60_000 });
  const performanceQuery = useQuery({ queryKey: ["supplier-performance"], queryFn: listSupplierPerformance, staleTime: 60_000 });
  const activityQuery = useQuery({ queryKey: ["activity"], queryFn: () => listActivity(8), staleTime: 30_000 });

  const suppliers = suppliersQuery.data || [];
  const performance = performanceQuery.data || [];

  const totalOrders = performance.reduce((sum, item) => sum + Number(item.total_orders || 0), 0);
  const cancelledOrders = performance.reduce((sum, item) => sum + Number(item.cancelled_orders || 0), 0);
  const fulfilledOrders = performance.reduce((sum, item) => sum + Number(item.fulfilled_orders || 0), 0);
  const revenue = performance.reduce((sum, item) => sum + Number(item.supplier_revenue || 0), 0);
  const cancellationRate = percentage(cancelledOrders, totalOrders);
  const lowFulfillment = performance.filter((item) => {
    const rate = percentage(item.fulfilled_orders, item.total_orders);
    return rate !== null && rate < 70;
  });
  const highCancellation = performance.filter((item) => {
    const rate = percentage(item.cancelled_orders, item.total_orders);
    return rate !== null && rate > 20;
  });
  const outdatedPriceLists = performance.filter((item) => olderThanDays(item.last_price_list_update, 90));
  const topSuppliers = [...performance].sort((a, b) => Number(b.fulfilled_orders || 0) - Number(a.fulfilled_orders || 0)).slice(0, 5);
  const chartData = [
    { name: "منفذة", value: fulfilledOrders },
    { name: "ملغاة", value: cancelledOrders },
    { name: "إجمالي", value: totalOrders },
  ];

  const cards = [
    { label: "عدد الموردين", value: formatNumber(suppliers.length), icon: Users, tone: "text-blue-300" },
    { label: "الموردون النشطون", value: formatNumber(suppliers.filter((supplier) => supplier.status === "Active").length), icon: PackageCheck, tone: "text-emerald-300" },
    { label: "عدد الطلبات", value: performance.length ? formatNumber(totalOrders) : "-", icon: BarChart3, tone: "text-emerald-300" },
    { label: "نسبة الإلغاء", value: cancellationRate === null ? "-" : `${cancellationRate.toFixed(1)}%`, icon: TrendingDown, tone: "text-rose-300" },
    { label: "إجمالي الإيرادات", value: performance.length ? formatCurrency(revenue) : "-", icon: PackageCheck, tone: "text-emerald-300" },
    { label: "مستندات قاربت على الانتهاء", value: "-", icon: FileWarning, tone: "text-amber-300" },
    { label: "موردين غير نشطين", value: formatNumber(suppliers.filter((supplier) => ["Inactive", "Blacklisted"].includes(supplier.status)).length), icon: AlertTriangle, tone: "text-rose-300" },
    { label: "موردون أضيفوا اليوم", value: formatNumber(suppliers.filter((supplier) => sameDate(supplier.created_at, "today")).length), icon: Clock, tone: "text-blue-300" },
    { label: "موردون أضيفوا هذا الأسبوع", value: formatNumber(suppliers.filter((supplier) => sameDate(supplier.created_at, "week")).length), icon: Clock, tone: "text-blue-300" },
    { label: "موردون أضيفوا هذا الشهر", value: formatNumber(suppliers.filter((supplier) => sameDate(supplier.created_at, "month")).length), icon: Clock, tone: "text-slate-300" },
    { label: "موردون مرتفعو الإلغاء", value: performance.length ? formatNumber(highCancellation.length) : "-", icon: TrendingDown, tone: "text-rose-300" },
    { label: "موردون منخفضو التنفيذ", value: performance.length ? formatNumber(lowFulfillment.length) : "-", icon: AlertTriangle, tone: "text-amber-300" },
    { label: "قوائم أسعار قديمة", value: performance.length ? formatNumber(outdatedPriceLists.length) : "-", icon: FileWarning, tone: "text-amber-300" },
  ];

  if (suppliersQuery.isLoading) return <LoadingState label="جاري تحميل لوحة التحكم..." />;

  return (
    <div className="space-y-6">
      {suppliersQuery.error && <Card className="p-4 text-rose-200">فشل تحميل بيانات الموردين</Card>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label} className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className="mt-2 text-3xl font-black text-white">{card.value}</p>
              </div>
              <div className={`rounded-2xl bg-slate-800 p-3 ${card.tone}`}>
                <card.icon className="h-6 w-6" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-white">نظرة أداء الموردين</h2>
              <p className="text-sm text-slate-500">يعتمد على مؤشرات الأداء المدخلة يدويًا عند توفرها.</p>
            </div>
          </div>
          {performance.length === 0 ? (
            <EmptyState title="لا توجد مؤشرات أداء بعد" subtitle="أدخل مؤشرات الموردين يدويًا من ملف المورد لعرض التحليلات." />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="name" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151", color: "#fff" }} />
                  <Bar dataKey="value" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-black text-white">موردون يحتاجون متابعة</h2>
          <div className="mt-4 space-y-3">
            {[...highCancellation, ...lowFulfillment, ...outdatedPriceLists].slice(0, 6).length === 0 ? (
              <EmptyState title="لا توجد حالات متابعة" subtitle="لا توجد مؤشرات عالية المخاطر حاليًا." />
            ) : (
              [...highCancellation, ...lowFulfillment, ...outdatedPriceLists].slice(0, 6).map((item) => (
                <div key={item.id || item.supplier_id} className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                  <p className="font-bold text-white">{item.supplier_name_ar || item.supplier_name_en || "مورد"}</p>
                  <p className="text-sm text-slate-500">مستوى الخدمة: {serviceScoreLabel(null)}</p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-lg font-black text-white">أفضل الموردين حسب الطلبات المنفذة</h2>
          <div className="mt-4 space-y-3">
            {topSuppliers.length === 0 ? (
              <EmptyState title="لا توجد بيانات كافية" subtitle="ستظهر القائمة بعد إدخال مؤشرات الأداء." />
            ) : (
              topSuppliers.map((item) => (
                <div key={item.id || item.supplier_id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-3">
                  <span className="font-bold text-white">{item.supplier_name_ar || item.supplier_name_en || "مورد"}</span>
                  <span className="text-emerald-300">{formatNumber(item.fulfilled_orders)}</span>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-black text-white">آخر النشاطات</h2>
          <div className="mt-4 space-y-4">
            {activityQuery.isLoading ? (
              <LoadingState />
            ) : (activityQuery.data || []).length === 0 ? (
              <EmptyState title="لا توجد نشاطات متاحة" />
            ) : (
              (activityQuery.data || []).map((item) => (
                <div key={item.id} className="border-r-2 border-blue-700 pr-4">
                  <p className="font-bold text-white">{item.action}</p>
                  <p className="text-sm text-slate-500">{item.entity_type} · {formatDateTime(item.created_at)}</p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
