import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router";
import {
  Activity,
  Bell,
  CreditCard,
  FileDown,
  FileText,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Menu,
  RefreshCw,
  Search,
  Settings,
  UserCircle,
  Users,
  
  Ticket,X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../features/auth/AuthProvider";
import { formatDateTime } from "../../lib/format";
import { roleLabels } from "../../lib/constants";
import { canExportDailyReports, canManageUsers } from "../../lib/permissions";
import { Button, Field, Input, Modal, cn } from "../shared/Primitives";
import { getUnreadNotificationCount, listNotifications, markNotificationRead } from "../../services/notificationService";
import {
  dailyReportSections,
  downloadDailyReportPdf,
  sendDailyReportEmail,
  type DailyReportSection,
} from "../../services/reportService";

const baseNavigation = [
  { name: "لوحة التحكم", href: "/", icon: LayoutDashboard },
  { name: "الموردين", href: "/suppliers", icon: Users },
  { name: "خريطة الموردين", href: "/suppliers/map", icon: MapPinned },
  { name: "تذاكر الطلبات", href: "/request-tickets", icon: Ticket },
  { name: "سداد الموردين", href: "/supplier-payment-requests", icon: CreditCard },
  { name: "مركز مستندات ClinicFeed", href: "/company-documents", icon: FileText },
  { name: "سجل النشاط", href: "/activity", icon: Activity },
  { name: "حسابي", href: "/account", icon: UserCircle },
];

function pageInfo(pathname: string) {
  if (pathname === "/") {
    return {
      title: "لوحة التحكم",
      subtitle: "نظرة تشغيلية على الموردين والمؤشرات والتنبيهات",
    };
  }

  if (pathname === "/request-tickets") {
    return {
      title: "تذاكر الطلبات",
      subtitle: "إنشاء ومتابعة طلبات العملاء اليدوية",
    };
  }

  if (pathname === "/supplier-payment-requests") {
    return {
      title: "سداد الموردين",
      subtitle: "طلبات سداد الموردين والفواتير والمستندات",
    };
  }

  if (pathname === "/company-documents") {
    return {
      title: "مركز مستندات ClinicFeed",
      subtitle: "مستندات الشركة الرسمية والملفات الداخلية",
    };
  }

  if (pathname === "/suppliers/map") {
    return {
      title: "خريطة الموردين",
      subtitle: "عرض مواقع الموردين المحفوظة على خريطة تفاعلية",
    };
  }

  if (pathname.startsWith("/suppliers/")) {
    return {
      title: "ملف المورد",
      subtitle: "البيانات، العقود، المستندات، وجهات الاتصال",
    };
  }

  if (pathname === "/suppliers") {
    return {
      title: "الموردين",
      subtitle: "إدارة الموردين والبحث والتصفية والمتابعة",
    };
  }

  if (pathname === "/users") {
    return {
      title: "إدارة المستخدمين",
      subtitle: "حسابات الموظفين والأدوار والصلاحيات",
    };
  }

  if (pathname === "/activity") {
    return {
      title: "سجل النشاط",
      subtitle: "آخر العمليات المسجلة في النظام",
    };
  }

  if (pathname === "/account") {
    return {
      title: "حسابي",
      subtitle: "بيانات الحساب وتغيير كلمة المرور",
    };
  }

  return {
    title: "ClinicFeed",
    subtitle: "منصة إدارة الموردين الداخلية",
  };
}

function formatHeaderClock(date: Date) {
  const time = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${time} | ${year}-${month}-${day}`;
}

function todayInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function AppLayout() {
  const { user, isAuthenticated, isLoading, logout, message, setMessage } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [headerSearch, setHeaderSearch] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [headerClock, setHeaderClock] = useState(() => new Date());
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = "dark";
    localStorage.removeItem("clinicfeed_theme");
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setHeaderClock(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const navigation = useMemo(() => {
    const items = [...baseNavigation];

    if (canManageUsers(user?.role)) {
      items.splice(2, 0, {
        name: "المستخدمين",
        href: "/users",
        icon: Settings,
      });
    }

    return items;
  }, [user?.role]);

  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: () => listNotifications(10),
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  const unreadCountQuery = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: getUnreadNotificationCount,
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0F172A] text-slate-300">
        جاري تحميل النظام...
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const info = pageInfo(location.pathname);
  const canExportReports = canExportDailyReports(user?.role);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  async function refreshActiveData() {
    try {
      setRefreshing(true);
      await queryClient.refetchQueries({ type: "active" });
      setMessage("تم تحديث البيانات");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "فشل تحديث البيانات");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div dir="rtl" className="flex min-h-screen bg-[#171E2D] text-[#F4F7FB]">
      {message && (
        <div className="fixed left-6 top-24 z-[60] rounded-2xl border border-blue-500/30 bg-blue-950 px-4 py-3 text-sm font-bold text-blue-100 -xl">
          {message}
        </div>
      )}

      {sidebarOpen && (
        <button
          className="fixed inset-0 z-40 bg-[#1F2433]/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="إغلاق القائمة"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-[272px] flex-col border-l border-[#2F394F] bg-[#1D2435] -[-16px_0_46px_rgba(4,8,18,0.34)] transition-[width,transform] duration-200 ease-out will-change-[width,transform] md:sticky md:top-0 md:translate-x-0",
          isSidebarCollapsed ? "md:w-[84px]" : "md:w-[272px]",
          sidebarOpen ? "translate-x-0" : "translate-x-full md:translate-x-0",
        )}
      >
        <div className={cn("relative flex items-center justify-between gap-2 border-b border-[#2F394F] bg-transparent px-4 py-5 transition-[padding] duration-200 ease-out", isSidebarCollapsed && "md:justify-center md:px-3")}>
          <Link to="/" className={cn("app-logo-link flex min-w-0 flex-1 items-center justify-center overflow-hidden bg-transparent transition-[max-width,opacity] duration-200 ease-out", isSidebarCollapsed && "md:max-w-0 md:opacity-0 md:pointer-events-none")}>
            <img
              src="/clinicfeed-logo-transparent.png"
              alt="ClinicFeed"
              className="h-16 w-auto max-w-[190px] object-contain"
            />
          </Link>

          <button
            className={cn(
              "hidden items-center justify-center rounded-xl border border-[#3A4560] bg-[#1E2638] text-[#C3CBE0] transition-colors duration-150 ease-out hover:bg-[#323D56] hover:text-[#F4F7FB] md:inline-flex",
              isSidebarCollapsed ? "h-11 w-11 p-0" : "p-2",
            )}
            onClick={() => setIsSidebarCollapsed((value) => !value)}
            aria-label={isSidebarCollapsed ? "توسيع القائمة الجانبية" : "طي القائمة الجانبية"}
            title={isSidebarCollapsed ? "توسيع القائمة" : "طي القائمة"}
          >
            <Menu className="h-5 w-5" />
          </button>

          <button
            className="absolute left-4 rounded-xl p-2 text-[#C3CBE0] hover:bg-[#323D56] md:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className={cn("flex-1 space-y-1.5 overflow-y-auto p-4 transition-[padding] duration-200 ease-out", isSidebarCollapsed && "md:flex md:flex-col md:items-center md:px-3 md:py-4")}>
          {navigation.map((item) => {
            const active =
              location.pathname === item.href ||
              (item.href !== "/" && item.href !== "/suppliers" && location.pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold transition-[background-color,color,width,padding] duration-200 ease-out",
                  isSidebarCollapsed && "md:h-11 md:w-11 md:justify-center md:px-0 md:py-0",
                  active
                    ? "bg-[#5B73E8]/15 text-white"
                    : "text-[#C3CBE0] hover:bg-[#323D56]/40 hover:text-[#F4F7FB]",
                )}
              >
                <item.icon className={cn("h-5 w-5 shrink-0", active ? "text-white" : "text-[#8E9AB6] group-hover:text-[#F4F7FB]")} />

                <span className={cn("overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-200 ease-out", isSidebarCollapsed ? "md:max-w-0 md:opacity-0" : "max-w-40 opacity-100")}>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className={cn("border-t border-[#2F394F] p-4 transition-[padding] duration-200 ease-out", isSidebarCollapsed && "md:flex md:justify-center md:px-3")}>
          <div className={cn("rounded-2xl border border-[#3A4560] bg-[#1E2638] p-4 -inner -black/10 transition-[width,height,padding,border-radius] duration-200 ease-out", isSidebarCollapsed && "md:grid md:h-11 md:w-11 md:place-items-center md:rounded-xl md:p-0")}>
            <p className={cn("font-black text-[#F4F7FB]", isSidebarCollapsed && "md:text-center")}>{isSidebarCollapsed ? "CF" : user?.name || "مستخدم النظام"}</p>
            <p className={cn("mt-1 overflow-hidden whitespace-nowrap text-xs text-[#8E9AB6] transition-[max-height,opacity] duration-200 ease-out", isSidebarCollapsed ? "md:max-h-0 md:opacity-0" : "max-h-5 opacity-100")}>
              {roleLabels[user?.role || "viewer"]}
            </p>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex min-h-20 items-center gap-3 border-b border-[#2F394F] bg-[#1D2435]/95 px-4 -[0_10px_32px_rgba(4,8,18,0.26)] backdrop-blur-xl sm:px-6 md:px-8">
          <button
            className="rounded-xl border border-[#373E55] bg-[#242A39] p-2 text-[#B8C1DD] md:hidden"
            onClick={() => setSidebarOpen((value) => !value)}
            aria-label="إظهار أو إخفاء القائمة الجانبية"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-black text-[#F4F7FB]">{info.title}</h1>
            <p className="truncate text-sm text-[#8E9AB6]">{info.subtitle}</p>
          </div>

          <div className="hidden h-10 w-72 items-center gap-2 rounded-xl border border-[#373E55] bg-[#242A39] px-3 text-[#8F99B8] -inner -black/5 xl:flex">
            <Search className="h-4 w-4" />
            <input
              value={headerSearch}
              onChange={(event) => setHeaderSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && headerSearch.trim()) {
                  navigate(`/suppliers?search=${encodeURIComponent(headerSearch.trim())}`);
                }
              }}
              className="h-full w-full bg-transparent text-sm leading-none text-[#F3F6F9] outline-none placeholder:text-[#707A99]"
              placeholder="بحث سريع داخل الموردين"
            />
          </div>

          <div className="hidden whitespace-nowrap rounded-2xl border border-[#373E55] bg-[#242A39] px-3 py-2 text-xs font-black text-[#C3CBE0] -inner -black/5 lg:block" dir="ltr">
            {formatHeaderClock(headerClock)}
          </div>

          <Button
            variant="secondary"
            onClick={refreshActiveData}
            disabled={refreshing}
            title="تحديث البيانات"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "جاري التحديث..." : "تحديث"}
          </Button>

          {canExportReports && (
            <Button variant="secondary" onClick={() => setReportOpen(true)}>
              <FileDown className="h-4 w-4" />
              تصدير تقرير PDF
            </Button>
          )}

          <button
            className="relative rounded-xl border border-[#373E55] bg-[#242A39] p-2 text-[#B8C1DD] hover:bg-[#343B52] hover:text-[#F3F6F9]"
            title="الإشعارات"
            onClick={() => setNotificationsOpen((value) => !value)}
          >
            <Bell className="h-5 w-5" />
            {(unreadCountQuery.data || 0) > 0 && (
              <span className="absolute -left-2 -top-2 min-w-5 rounded-full bg-rose-500 px-1.5 py-0.5 text-center text-[10px] font-black text-white">
                {unreadCountQuery.data}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute left-4 top-20 z-50 w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-[#373E55] bg-[#1E2638] -[0_22px_60px_rgba(0,0,0,0.38)]">
              <div className="border-b border-[#30364A] px-4 py-3">
                <p className="font-black text-white">الإشعارات</p>
                <p className="text-xs text-[#8E9AB6]">آخر التحديثات المهمة في النظام</p>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {(notificationsQuery.data || []).length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-[#8E9AB6]">لا توجد إشعارات حالية</div>
                ) : (
                  (notificationsQuery.data || []).map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      className={cn(
                        "block w-full border-b border-[#30364A] px-4 py-3 text-right transition hover:bg-[#2A3348]",
                        !notification.is_read && "bg-[#2A3348]/70",
                      )}
                      onClick={() => {
                        if (!notification.is_read) markReadMutation.mutate(notification.id);
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-black text-white">{notification.title || "تحديث مهم"}</p>
                        {!notification.is_read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-rose-500" />}
                      </div>
                      <p className="mt-1 text-sm leading-6 text-[#C3CBE0]">{notification.message || "-"}</p>
                      <p className="mt-2 text-xs text-[#8E9AB6]">
                        {notification.actor_name || notification.user_name || "مستخدم النظام"} · {formatDateTime(notification.created_at)}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            خروج
          </Button>
        </header>

        {reportOpen && (
          <DailyReportModal
            onClose={() => setReportOpen(false)}
            setMessage={setMessage}
          />
        )}

        <main className="p-4 sm:p-6 lg:p-8 xl:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function DailyReportModal({
  onClose,
  setMessage,
}: {
  onClose: () => void;
  setMessage: (message: string) => void;
}) {
  const [date, setDate] = useState(todayInputValue());
  const [sections, setSections] = useState<DailyReportSection[]>(
    dailyReportSections.map((section) => section.id),
  );
  const [busy, setBusy] = useState<"download" | "email" | null>(null);
  const [error, setError] = useState("");

  function toggleSection(section: DailyReportSection) {
    setSections((current) => (
      current.includes(section)
        ? current.filter((item) => item !== section)
        : [...current, section]
    ));
  }

  async function run(action: "download" | "email") {
    if (sections.length === 0) {
      setError("اختر قسمًا واحدًا على الأقل للتقرير");
      return;
    }

    setBusy(action);
    setError("");

    try {
      if (action === "download") {
        await downloadDailyReportPdf({ date, sections });
        setMessage("تم تحميل تقرير PDF");
      } else {
        await sendDailyReportEmail({ date, sections });
        setMessage("تم إرسال التقرير بالإيميل");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تنفيذ العملية");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Modal title="تصدير تقرير العمليات اليومي" onClose={onClose}>
      <div dir="rtl" className="space-y-5">
        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm font-bold text-rose-200">
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="تاريخ التقرير" required>
            <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </Field>
          <div className="rounded-2xl border border-[#3A4560] bg-[#1E2638] p-4">
            <p className="text-sm font-black text-white">نطاق التقرير</p>
            <p className="mt-2 text-sm leading-7 text-[#9FB2D9]">
              يتم احتساب اليوم من 00:00 إلى 23:59 بتوقيت السعودية.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#3A4560] bg-[#1E2638] p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-black text-white">أقسام التقرير</p>
              <p className="mt-1 text-sm text-[#8E9AB6]">اختر المحتوى الذي سيظهر في ملف PDF.</p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setSections(dailyReportSections.map((section) => section.id))}
              >
                تحديد الكل
              </Button>
              <Button type="button" variant="ghost" onClick={() => setSections([])}>
                إلغاء الكل
              </Button>
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            {dailyReportSections.map((section) => (
              <label
                key={section.id}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#2F394F] bg-[#172033] px-3 py-3 text-sm font-bold text-[#F4F7FB] transition hover:bg-[#24324D]"
              >
                <input
                  type="checkbox"
                  checked={sections.includes(section.id)}
                  onChange={() => toggleSection(section.id)}
                  className="h-4 w-4 accent-[#5B73E8]"
                />
                <span>{section.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            إغلاق
          </Button>
          <Button type="button" variant="secondary" onClick={() => run("email")} disabled={busy !== null}>
            <FileText className="h-4 w-4" />
            {busy === "email" ? "جاري الإرسال..." : "إرسال التقرير بالإيميل"}
          </Button>
          <Button type="button" onClick={() => run("download")} disabled={busy !== null}>
            <FileDown className="h-4 w-4" />
            {busy === "download" ? "جاري التحميل..." : "تحميل PDF"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}





