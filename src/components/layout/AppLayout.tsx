import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router";
import {
  Activity,
  Bell,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  Search,
  Settings,
  UserCircle,
  Users,
  
  Ticket,X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../features/auth/AuthProvider";
import { roleLabels } from "../../lib/constants";
import { canManageUsers } from "../../lib/permissions";
import { Button, cn } from "../shared/Primitives";

const baseNavigation = [
  { name: "لوحة التحكم", href: "/", icon: LayoutDashboard },
  { name: "الموردين", href: "/suppliers", icon: Users },
  { name: "تذاكر الطلبات", href: "/request-tickets", icon: Ticket },
  { name: "سداد الموردين", href: "/supplier-payment-requests", icon: CreditCard },
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

export function AppLayout() {
  const { user, isAuthenticated, isLoading, logout, message, setMessage } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [headerSearch, setHeaderSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = "dark";
    localStorage.removeItem("clinicfeed_theme");
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

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0F172A] text-slate-300">
        جاري تحميل النظام...
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const info = pageInfo(location.pathname);

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
        <div className="fixed left-6 top-24 z-[60] rounded-2xl border border-blue-500/30 bg-blue-950 px-4 py-3 text-sm font-bold text-blue-100 shadow-xl">
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
          "fixed inset-y-0 right-0 z-50 flex w-[272px] flex-col border-l border-[#2F394F] bg-[#1D2435] shadow-[-16px_0_46px_rgba(4,8,18,0.34)] transition-all duration-300 md:sticky md:top-0 md:translate-x-0",
          isSidebarCollapsed ? "md:w-[92px]" : "md:w-[272px]",
          sidebarOpen ? "translate-x-0" : "translate-x-full md:translate-x-0",
        )}
      >
        <div className="relative flex items-center justify-between gap-2 border-b border-[#2F394F] bg-transparent px-4 py-5">
          <Link to="/" className={cn("flex min-w-0 flex-1 items-center justify-center bg-transparent", isSidebarCollapsed && "hidden md:flex")}>
            {isSidebarCollapsed ? (
              <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-[#3A4560] bg-[#242C3F]">
                <img
                  src="/clinicfeed-logo.png.svg"
                  alt="ClinicFeed"
                  className="h-7 w-7 object-cover object-center"
                />
              </span>
            ) : (
              <img
                src="/clinicfeed-logo.png.svg"
                alt="ClinicFeed"
                className="sidebar-logo-img logo-needs-crop h-16 w-[190px] object-cover object-center drop-shadow-[0_8px_20px_rgba(0,0,0,0.28)]"
              />
            )}
          </Link>

          <button
            className="hidden rounded-xl border border-[#3A4560] bg-[#1E2638] p-2 text-[#C3CBE0] hover:bg-[#323D56] hover:text-[#F4F7FB] md:inline-flex"
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

        <nav className={cn("flex-1 space-y-1.5 overflow-y-auto p-4", isSidebarCollapsed && "md:px-3")}>
          {navigation.map((item) => {
            const active =
              location.pathname === item.href ||
              (item.href !== "/" && location.pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "group flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm font-bold transition duration-200 hover:-translate-y-px",
                  isSidebarCollapsed && "md:justify-center md:px-2.5",
                  active
                    ? "border-[#6F85F2]/45 bg-[#5B73E8] text-white shadow-[0_12px_26px_rgba(91,115,232,0.26)]"
                    : "border-transparent text-[#C3CBE0] hover:border-[#3A4560] hover:bg-[#323D56] hover:text-[#F4F7FB]",
                )}
              >
                <item.icon className={cn("h-5 w-5", active ? "text-white" : "text-[#8E9AB6] group-hover:text-[#F4F7FB]")} />

                <span className={cn(isSidebarCollapsed && "md:hidden")}>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className={cn("border-t border-[#2F394F] p-4", isSidebarCollapsed && "md:px-3")}>
          <div className="rounded-2xl border border-[#3A4560] bg-[#1E2638] p-4 shadow-inner shadow-black/10">
            <p className={cn("font-black text-[#F4F7FB]", isSidebarCollapsed && "md:text-center")}>{isSidebarCollapsed ? "CF" : user?.name || "مستخدم النظام"}</p>
            <p className={cn("mt-1 text-xs text-[#8E9AB6]", isSidebarCollapsed && "md:hidden")}>
              {roleLabels[user?.role || "viewer"]}
            </p>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex min-h-20 items-center gap-3 border-b border-[#2F394F] bg-[#1D2435]/95 px-4 shadow-[0_10px_32px_rgba(4,8,18,0.26)] backdrop-blur-xl sm:px-6 md:px-8">
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

          <div className="hidden w-72 items-center gap-2 rounded-2xl border border-[#373E55] bg-[#242A39] px-3 py-2 text-[#8F99B8] shadow-inner shadow-black/5 xl:flex">
            <Search className="h-4 w-4" />
            <input
              value={headerSearch}
              onChange={(event) => setHeaderSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && headerSearch.trim()) {
                  navigate(`/suppliers?search=${encodeURIComponent(headerSearch.trim())}`);
                }
              }}
              className="w-full bg-transparent text-sm text-[#F3F6F9] outline-none placeholder:text-[#707A99]"
              placeholder="بحث سريع داخل الموردين"
            />
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

          <button
            className="rounded-xl border border-[#373E55] bg-[#242A39] p-2 text-[#B8C1DD] hover:bg-[#343B52] hover:text-[#F3F6F9]"
            title="الإشعارات"
            onClick={() => setMessage("لا توجد إشعارات جديدة حاليًا")}
          >
            <Bell className="h-5 w-5" />
          </button>

          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            خروج
          </Button>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 xl:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}




