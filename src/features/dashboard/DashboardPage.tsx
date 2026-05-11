import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, BarChart3, CheckCircle2, Clock, FileWarning, PackageCheck, Sparkles, Target, TrendingDown, Users } from "lucide-react";
import { Area, AreaChart, Bar as RechartsBar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { listActivity } from "../../services/activityService";
import { getDashboardRequestTicketsSummary, listRequestTickets } from "../../services/requestTicketService";
import { listAllDocuments, listSupplierPerformance, listSuppliers } from "../../services/supplierService";
import { Card, EmptyState, LoadingState } from "../../components/shared/Primitives";
import { expiryState, formatCurrency, formatDateTime, formatNumber, formatPercent, percentage, safePercent, serviceScoreLabel } from "../../lib/format";
import { averageCompletedCycleMs, formatDuration, ticketDelayLabel, ticketDelayLevel } from "../../lib/ticketMetrics";
import type { RequestTicket, RequestTicketsSummary } from "../../types";

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

function summaryValue(summary: RequestTicketsSummary | undefined, keys: Array<keyof RequestTicketsSummary>) {
  for (const key of keys) {
    const value = summary?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return 0;
}

function miniBarsFromValues(values: number[]) {
  const finite = values.filter((value) => Number.isFinite(value) && value > 0);
  if (!finite.length) return [18, 18, 18, 18, 18, 18];
  const max = Math.max(...finite);
  return values.slice(0, 6).map((value) => max > 0 ? Math.max(18, Math.round((Math.max(0, value) / max) * 100)) : 18);
}

function OperationalAlert({ title, value, tone }: { title: string; value: string; tone: "warning" | "danger" }) {
  const className = tone === "danger"
    ? "border-[#F46A6A]/30 bg-[#F46A6A]/10 text-[#F46A6A]"
    : "border-[#F1B44C]/30 bg-[#F1B44C]/10 text-[#F1B44C]";
  return (
    <div className={`flex items-center justify-between rounded-xl border p-3 ${className}`}>
      <span className="font-bold">{title}</span>
      <span className="text-sm font-black">{value}</span>
    </div>
  );
}

function KpiCard({
  label,
  value,
  helper,
  icon: Icon,
  accent,
  progress,
  bars,
}: {
  label: string;
  value: string;
  helper: string;
  icon: typeof BarChart3;
  accent: "blue" | "green" | "warning" | "danger";
  progress: number | null;
  bars: number[];
}) {
  const theme = {
    blue: { text: "text-[#6D83F2]", bg: "bg-[#556EE6]/16", border: "border-[#556EE6]/35", hex: "#556EE6", glow: "shadow-[0_16px_38px_rgba(85,110,230,0.20)]" },
    green: { text: "text-[#34C38F]", bg: "bg-[#34C38F]/14", border: "border-[#34C38F]/30", hex: "#34C38F", glow: "shadow-[0_16px_38px_rgba(52,195,143,0.16)]" },
    warning: { text: "text-[#F1B44C]", bg: "bg-[#F1B44C]/14", border: "border-[#F1B44C]/30", hex: "#F1B44C", glow: "shadow-[0_16px_38px_rgba(241,180,76,0.16)]" },
    danger: { text: "text-[#F46A6A]", bg: "bg-[#F46A6A]/14", border: "border-[#F46A6A]/30", hex: "#F46A6A", glow: "shadow-[0_16px_38px_rgba(244,106,106,0.16)]" },
  }[accent];
  const safeProgress = typeof progress === "number" && Number.isFinite(progress) ? Math.max(0, Math.min(100, Math.round(progress))) : null;

  return (
    <Card className={`group overflow-hidden border-[#343A4F] bg-[#2B3042] p-5 ${theme.glow}`}>
      <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: theme.hex }} />
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-[#B8C1DD]">{label}</p>
          <p className="mt-3 text-4xl font-black tracking-tight text-[#F3F6F9]">{value}</p>
          <p className="mt-2 text-xs font-bold text-[#8F99B8]">{helper}</p>
        </div>
        <div className={`${theme.text} ${theme.bg} ${theme.border} rounded-2xl border p-3`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="relative z-10 mt-6 flex items-end justify-between gap-4">
        <div className="flex h-12 flex-1 items-end gap-1.5 rounded-2xl border border-[#343A4F] bg-[#252B3A] px-3 py-2">
          {bars.map((height, index) => (
            <span
              key={index}
              className="w-full rounded-t-md opacity-80 transition group-hover:opacity-100"
              style={{ height: `${Math.max(18, Math.min(100, height))}%`, backgroundColor: theme.hex }}
            />
          ))}
        </div>
        <div
          className="grid h-14 w-14 place-items-center rounded-full text-xs font-black"
          style={{
            background: `conic-gradient(${theme.hex} ${(safeProgress || 0) * 3.6}deg, #1E2638 0deg)`,
          }}
        >
          <div className="grid h-10 w-10 place-items-center rounded-full bg-[#242C3F] text-[11px] text-[#F4F7FB]">{safeProgress === null ? "-" : `${safeProgress}%`}</div>
        </div>
      </div>
    </Card>
  );
}

function MetricPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-2xl border border-[#343A4F] bg-[#252B3A] p-4">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
        <p className="text-xs font-bold text-[#8F99B8]">{label}</p>
      </div>
      <p className="mt-2 text-xl font-black text-[#F3F6F9]">{value}</p>
    </div>
  );
}

function DashboardListItem({ title, subtitle, badge, tone = "blue" }: { title: string; subtitle: string; badge: string; tone?: "blue" | "warning" | "danger" | "green" }) {
  const classes = {
    blue: "border-[#556EE6]/30 bg-[#556EE6]/10 text-[#6D83F2]",
    warning: "border-[#F1B44C]/30 bg-[#F1B44C]/10 text-[#F1B44C]",
    danger: "border-[#F46A6A]/30 bg-[#F46A6A]/10 text-[#F46A6A]",
    green: "border-[#34C38F]/30 bg-[#34C38F]/10 text-[#34C38F]",
  }[tone];

  return (
    <div className="rounded-2xl border border-[#343A4F] bg-[#252B3A] p-4 transition hover:bg-[#343A4F]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-black text-[#F3F6F9]">{title}</p>
          <p className="mt-1 truncate text-sm text-[#8F99B8]">{subtitle}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black ${classes}`}>{badge}</span>
      </div>
    </div>
  );
}

function ChartPlaceholderBars() {
  return (
    <div className="flex h-full items-center justify-center rounded-3xl border border-[#3A4560] bg-[#1E2638] p-6">
      <EmptyState title="لا توجد بيانات كافية لعرض الرسم" subtitle="ستظهر المؤشرات بعد توفر الطلبات ومؤشرات الموردين من الخادم." />
    </div>
  );
}

function OperationsChart({ data, hasData }: { data: Array<{ name: string; value: number; secondary: number }>; hasData: boolean }) {
  return (
    <div className="h-[360px] min-h-[360px] min-w-0 w-full">
      {hasData ? (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="dashboardBlue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#556EE6" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#556EE6" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="dashboardGreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#34C38F" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#34C38F" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#343A4F" vertical={false} />
            <XAxis dataKey="name" stroke="#8F99B8" tickLine={false} axisLine={false} />
            <YAxis stroke="#8F99B8" tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background: "#252B3A", border: "1px solid #343A4F", borderRadius: 16, color: "#F3F6F9" }} />
            <Area type="monotone" dataKey="value" stroke="#556EE6" strokeWidth={3} fill="url(#dashboardBlue)" />
            <Area type="monotone" dataKey="secondary" stroke="#34C38F" strokeWidth={3} fill="url(#dashboardGreen)" />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <ChartPlaceholderBars />
      )}
    </div>
  );
}

function CompactBarChart({ data }: { data: Array<{ name: string; value: number }> }) {
  const hasData = data.some((item) => item.value > 0);
  return (
    <div className="h-52 min-h-52 min-w-0 w-full rounded-3xl border border-[#343A4F] bg-[#252B3A] p-4">
      {hasData ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#343A4F" vertical={false} />
            <XAxis dataKey="name" stroke="#8F99B8" tickLine={false} axisLine={false} />
            <YAxis stroke="#8F99B8" tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background: "#252B3A", border: "1px solid #343A4F", borderRadius: 16, color: "#F3F6F9" }} />
            <RechartsBar dataKey="value" fill="#556EE6" radius={[10, 10, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <EmptyState title="لا توجد بيانات كافية لعرض الرسم" subtitle="ستظهر الرسوم بعد توفر بيانات الطلبات." />
      )}
    </div>
  );
}

function PriorityMeter({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const percent = Math.min(100, Math.round((value / Math.max(total, 1)) * 100));
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm font-bold text-white/85">
        <span>{label}</span>
        <span>{formatNumber(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/15">
        <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export function DashboardPage() {
  const suppliersQuery = useQuery({ queryKey: ["suppliers"], queryFn: listSuppliers, staleTime: 60_000 });
  const performanceQuery = useQuery({ queryKey: ["supplier-performance"], queryFn: listSupplierPerformance, staleTime: 60_000 });
  const activityQuery = useQuery({ queryKey: ["activity"], queryFn: () => listActivity(8), staleTime: 30_000 });
  const requestTicketsSummaryQuery = useQuery({
    queryKey: ["dashboardRequestTicketsSummary"],
    queryFn: getDashboardRequestTicketsSummary,
    staleTime: 60_000,
  });
  const requestTicketsQuery = useQuery({
    queryKey: ["dashboardRequestTickets"],
    queryFn: () => listRequestTickets({ view: "all" }),
    staleTime: 60_000,
  });
  const documentsQuery = useQuery({ queryKey: ["dashboardDocuments"], queryFn: listAllDocuments, staleTime: 60_000 });

  const suppliers = suppliersQuery.data || [];
  const performance = performanceQuery.data || [];
  const requestTickets = requestTicketsQuery.data || [];
  const documents = documentsQuery.data || [];

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

  const ticketSummary = requestTicketsSummaryQuery.data;
  const delayedTickets = requestTickets.filter((ticket) => ticketDelayLevel(ticket));
  const highDelayTickets = requestTickets.filter((ticket) => ticketDelayLevel(ticket) === "high");
  const averageCycle = averageCompletedCycleMs(requestTickets as RequestTicket[]);
  const expiredDocuments = documents.filter((document) => expiryState(document.expiry_date).tone === "danger");
  const expiringDocuments = documents.filter((document) => expiryState(document.expiry_date).tone === "warning");
  const activeSuppliers = suppliers.filter((supplier) => supplier.status === "Active").length;
  const totalRequestsCount = Number(summaryValue(ticketSummary, ["total_requests", "total_tickets", "total"])) || requestTickets.length;
  const ticketCreatedByDay = requestTickets.reduce<Record<string, number>>((acc, ticket) => {
    if (!ticket.created_at) return acc;
    const key = formatDateTime(ticket.created_at).slice(0, 10);
    if (key !== "-") acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const operationsTrendData = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    const label = index === 6 ? "اليوم" : date.toLocaleDateString("ar-SA", { weekday: "short" });
    const dayTickets = requestTickets.filter((ticket) => ticket.created_at?.slice(0, 10) === key);
    return {
      name: label,
      value: ticketCreatedByDay[key] || 0,
      secondary: dayTickets.filter((ticket) => ticketDelayLevel(ticket)).length,
    };
  });
  const hasTrendData = operationsTrendData.some((item) => item.value > 0 || item.secondary > 0);
  const activeSupplierPercent = safePercent(activeSuppliers, suppliers.length);
  const documentRiskPercent = safePercent(expiringDocuments.length + expiredDocuments.length, documents.length);
  const delayedTicketPercent = safePercent(delayedTickets.length, requestTickets.length);
  const ticketCards = [
    { label: "إجمالي الطلبات", value: requestTicketsSummaryQuery.isLoading ? "-" : formatNumber(totalRequestsCount), helper: totalRequestsCount > 0 ? "إجمالي تذاكر الطلبات المتوفرة" : "لا توجد تذاكر حالياً", icon: BarChart3, accent: "blue" as const, progress: delayedTicketPercent, bars: miniBarsFromValues(operationsTrendData.map((item) => item.value)) },
    { label: "الموردين النشطين", value: formatNumber(activeSuppliers), helper: activeSupplierPercent === null ? "لا توجد بيانات موردين كافية" : `${formatPercent(activeSupplierPercent)} من قاعدة الموردين`, icon: Users, accent: "green" as const, progress: activeSupplierPercent, bars: miniBarsFromValues([activeSuppliers, suppliers.length - activeSuppliers, suppliers.length]) },
    { label: "مستندات حرجة", value: documentsQuery.isLoading ? "-" : formatNumber(expiringDocuments.length + expiredDocuments.length), helper: documents.length ? "مستندات منتهية أو تنتهي قريبًا" : "لا توجد مستندات متاحة", icon: FileWarning, accent: "warning" as const, progress: documentRiskPercent, bars: miniBarsFromValues([expiredDocuments.length, expiringDocuments.length, documents.length]) },
    { label: "متوسط التنفيذ", value: requestTicketsQuery.isLoading ? "-" : formatDuration(averageCycle), helper: averageCycle === null ? "لا توجد طلبات منفذة لحساب المتوسط" : "متوسط دورة الطلبات المنفذة", icon: Clock, accent: highDelayTickets.length ? "danger" as const : "blue" as const, progress: delayedTicketPercent, bars: miniBarsFromValues(operationsTrendData.map((item) => item.secondary)) },
  ];

  const cards = [
    { label: "عدد الموردين", value: formatNumber(suppliers.length), icon: Users, tone: "text-blue-300" },
    { label: "الموردون النشطون", value: formatNumber(suppliers.filter((supplier) => supplier.status === "Active").length), icon: PackageCheck, tone: "text-emerald-300" },
    { label: "عدد الطلبات", value: performance.length ? formatNumber(totalOrders) : "-", icon: BarChart3, tone: "text-emerald-300" },
    { label: "نسبة الإلغاء", value: cancellationRate === null ? "-" : formatPercent(cancellationRate, 1), icon: TrendingDown, tone: "text-rose-300" },
    { label: "إجمالي الإيرادات", value: performance.length ? formatCurrency(revenue) : "-", icon: PackageCheck, tone: "text-emerald-300" },
    { label: "مستندات منتهية", value: documentsQuery.isLoading ? "-" : formatNumber(expiredDocuments.length), icon: FileWarning, tone: "text-rose-300" },
    { label: "مستندات قاربت على الانتهاء", value: documentsQuery.isLoading ? "-" : formatNumber(expiringDocuments.length), icon: FileWarning, tone: "text-amber-300" },
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
    <div className="space-y-7">
      {suppliersQuery.error && <Card className="p-4 text-rose-200">فشل تحميل بيانات الموردين</Card>}
      {requestTicketsSummaryQuery.error && <Card className="p-4 text-rose-200">فشل تحميل ملخص تذاكر الطلبات</Card>}

      <Card className="overflow-hidden border-[#343A4F] bg-[radial-gradient(circle_at_15%_15%,rgba(85,110,230,0.28),transparent_34%),linear-gradient(135deg,#2B3042_0%,#252B3A_52%,#202535_100%)] p-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#556EE6]/35 bg-[#556EE6]/12 px-3 py-1 text-xs font-black text-[#8EA0FF]">
              <Sparkles className="h-3.5 w-3.5" />
              لوحة متابعة تشغيلية مباشرة
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-[#F3F6F9] md:text-4xl">نظرة عامة على عمليات ClinicFeed</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-[#B8C1DD]">مؤشرات الطلبات، الموردين، المستندات والتنبيهات الحرجة في واجهة Dashboard أكثر وضوحًا وقربًا.</p>
          </div>
          <div className="grid min-w-[280px] grid-cols-2 gap-3">
            <MetricPill label="إيرادات الموردين" value={performance.length ? formatCurrency(revenue) : "-"} color="#34C38F" />
            <MetricPill label="نسبة الإلغاء" value={cancellationRate === null ? "-" : formatPercent(cancellationRate, 1)} color="#F46A6A" />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {ticketCards.map((card) => (
          <KpiCard key={card.label} {...card} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.45fr)]">
        <Card className="overflow-hidden border-[#343A4F] bg-[#2B3042] p-6">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-black text-[#F3F6F9]">مخطط أداء العمليات</h2>
              <p className="text-sm text-[#8F99B8]">منحنى تشغيلي للطلبات المنفذة مقابل التنبيهات/الإلغاءات خلال الأسبوع.</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-bold text-[#B8C1DD]">
              <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#556EE6]" />الطلبات</span>
              <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#34C38F]" />المتابعة</span>
            </div>
          </div>
          <OperationsChart data={operationsTrendData} hasData={hasTrendData} />
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <MetricPill label="منفذة" value={formatNumber(fulfilledOrders)} color="#34C38F" />
            <MetricPill label="ملغاة" value={formatNumber(cancelledOrders)} color="#F46A6A" />
            <MetricPill label="إجمالي الحركة" value={formatNumber(totalOrders || totalRequestsCount)} color="#556EE6" />
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="overflow-hidden border-[#6D83F2]/35 bg-[radial-gradient(circle_at_20%_10%,rgba(80,165,241,0.30),transparent_32%),linear-gradient(145deg,#556EE6_0%,#485EC4_58%,#343A4F_100%)] p-5 shadow-[0_18px_44px_rgba(85,110,230,0.22)]">
            <div className="relative z-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/15">
                <Target className="h-6 w-6 text-white" />
              </div>
              <p className="mt-5 text-sm font-bold text-white/80">متابعة تشغيلية</p>
              <h2 className="mt-3 text-2xl font-black leading-9 text-white">راجع الطلبات المتأخرة والمستندات الحرجة قبل نهاية اليوم.</h2>
            </div>
          </Card>

          <Card className="border-[#343A4F] bg-[#2B3042] p-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-black text-white">الأولويات</h2>
              <CheckCircle2 className="h-5 w-5 text-[#34C38F]" />
            </div>
            <div className="space-y-5">
              <PriorityMeter label="طلبات متأخرة" value={delayedTickets.length} total={Math.max(requestTickets.length, 1)} color="#F1B44C" />
              <PriorityMeter label="مستندات منتهية" value={expiredDocuments.length} total={Math.max(documents.length, 1)} color="#F46A6A" />
              <PriorityMeter label="طلبات بدون مورد" value={Number(summaryValue(ticketSummary, ["tickets_without_supplier", "requests_without_supplier"])) || 0} total={Math.max(requestTickets.length, 1)} color="#50A5F1" />
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-white">تنبيهات تشغيلية</h2>
              <p className="text-sm text-[#8F99B8]">مخاطر المستندات وتأخر الطلبات التي تحتاج متابعة.</p>
            </div>
            <AlertTriangle className="h-6 w-6 text-[#F1B44C]" />
          </div>
          <div className="space-y-3">
            {expiredDocuments.length > 0 && <OperationalAlert title="مستندات مهمة منتهية" value={`${formatNumber(expiredDocuments.length)} مستند`} tone="danger" />}
            {expiringDocuments.length > 0 && <OperationalAlert title="مستندات تنتهي قريبًا" value={`${formatNumber(expiringDocuments.length)} مستند`} tone="warning" />}
            {highDelayTickets.length > 0 && <OperationalAlert title="طلبات بتأخير عالي" value={`${formatNumber(highDelayTickets.length)} طلب`} tone="danger" />}
            {delayedTickets.length > 0 && <OperationalAlert title="طلبات تحتاج متابعة" value={`${formatNumber(delayedTickets.length)} طلب`} tone="warning" />}
            {expiredDocuments.length === 0 && expiringDocuments.length === 0 && delayedTickets.length === 0 && (
              <EmptyState title="لا توجد تنبيهات تشغيلية حرجة" subtitle="المؤشرات الحالية لا تعرض مخاطر مستندات أو تأخر طلبات." />
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-black text-white">حالة الطلبات المتأخرة</h2>
          <div className="mt-4 space-y-3">
            {delayedTickets.length === 0 ? (
              <EmptyState title="لا توجد طلبات متأخرة" subtitle="ستظهر هنا الطلبات المفتوحة لأكثر من 24 ساعة." />
            ) : (
              delayedTickets.slice(0, 6).map((ticket) => (
                <div key={ticket.id} className="rounded-xl border border-[#373E55] bg-[#242A39] p-3 transition hover:border-[#556EE6]/40 hover:bg-[#343B52]">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold text-white">{ticket.ticket_number || ticket.customer_name}</p>
                    <span className={`rounded-full border px-3 py-1 text-xs font-black ${ticketDelayLevel(ticket) === "high" ? "border-[#F46A6A]/30 bg-[#F46A6A]/10 text-[#F46A6A]" : "border-[#F1B44C]/30 bg-[#F1B44C]/10 text-[#F1B44C]"}`}>
                      {ticketDelayLabel(ticket)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[#8F99B8]">{ticket.customer_name || "-"} - {formatDateTime(ticket.created_at || undefined)}</p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.slice(0, 8).map((card) => (
          <Card key={card.label} className="cf-stat-card p-5">
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-sm text-[#8F99B8]">{card.label}</p>
                <p className="mt-2 text-3xl font-black text-white">{card.value}</p>
              </div>
              <div className={`rounded-2xl border border-[#373E55] bg-[#242A39] p-3 ${card.tone}`}>
                <card.icon className="h-6 w-6" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-5">
          <h2 className="text-lg font-black text-white">موردون يحتاجون متابعة</h2>
          <div className="mt-4 space-y-3">
            {[...highCancellation, ...lowFulfillment, ...outdatedPriceLists].slice(0, 6).length === 0 ? (
              <EmptyState title="لا توجد حالات متابعة" subtitle="لا توجد مؤشرات عالية المخاطر حاليًا." />
            ) : (
              [...highCancellation, ...lowFulfillment, ...outdatedPriceLists].slice(0, 6).map((item) => (
                <div key={item.id || item.supplier_id} className="rounded-xl border border-[#373E55] bg-[#242A39] p-3 transition hover:border-[#556EE6]/40 hover:bg-[#343B52]">
                  <p className="font-bold text-white">{item.supplier_name_ar || item.supplier_name_en || "مورد"}</p>
                  <p className="text-sm text-[#8F99B8]">مستوى الخدمة: {serviceScoreLabel(null)}</p>
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
                <div key={item.id || item.supplier_id} className="flex items-center justify-between rounded-xl border border-[#373E55] bg-[#242A39] p-3 transition hover:border-[#556EE6]/40 hover:bg-[#343B52]">
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
                <div key={item.id} className="border-r-2 border-[#556EE6] pr-4">
                  <p className="font-bold text-white">{item.action}</p>
                  <p className="text-sm text-[#8F99B8]">{item.entity_type} - {formatDateTime(item.created_at)}</p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
