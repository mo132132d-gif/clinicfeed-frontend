import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router";
import {
  Activity,
  Bell,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
  UserCircle,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../features/auth/AuthProvider";
import { roleLabels, THEME_KEY } from "../../lib/constants";
import { canManageUsers } from "../../lib/permissions";
import { Button, cn } from "../shared/Primitives";

const baseNavigation = [
  { name: "لوحة التحكم", href: "/", icon: LayoutDashboard },
  { name: "الموردين", href: "/suppliers", icon: Users },
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [headerSearch, setHeaderSearch] = useState("");
  const [dark, setDark] = useState(() => localStorage.getItem(THEME_KEY) === "dark");
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  }, [dark]);

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

  function toggleSidebar() {
    if (window.innerWidth < 1024) {
      setSidebarOpen((value) => !value);
      return;
    }

    setSidebarCollapsed((value) => !value);
  }

  return (
    <div dir="rtl" className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {message && (
        <div className="fixed left-6 top-24 z-[60] rounded-2xl border border-blue-500/30 bg-blue-950 px-4 py-3 text-sm font-bold text-blue-100 shadow-xl">
          {message}
        </div>
      )}

      {sidebarOpen && (
        <button
          className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="إغلاق القائمة"
        />
      )}

      <button
        className="fixed right-4 top-4 z-[70] rounded-xl border border-slate-200 bg-white/95 p-2 text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200 dark:hover:bg-slate-800"
        onClick={toggleSidebar}
        aria-label="إظهار أو إخفاء القائمة الجانبية"
      >
        <Menu className="h-5 w-5" />
      </button>

      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex flex-col border-l border-slate-200 bg-white transition-all duration-300 dark:border-slate-800 dark:bg-slate-950 lg:sticky lg:top-0 lg:translate-x-0",
          sidebarCollapsed ? "w-[270px] lg:w-20" : "w-[270px]",
          sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0",
        )}
      >
        <div className="relative flex h-32 items-center justify-center border-b border-slate-200 px-5 dark:border-slate-800">
          <Link
            to="/"
            className={cn("flex h-28 items-center justify-center overflow-hidden rounded-2xl", sidebarCollapsed ? "w-14 lg:w-14" : "w-full")}
          >
            <img
              src="/clinicfeed-logo.png.svg"
              alt="ClinicFeed"
              className="h-28 w-auto scale-[2.8] object-contain"
            />
          </Link>

          <button
            className="absolute left-4 rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto p-4">
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
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition",
                  active
                    ? "bg-blue-900/70 text-white ring-1 ring-blue-700/60"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white",
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className={cn(sidebarCollapsed ? "lg:hidden" : "block")}>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-4 dark:border-slate-800">
          <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="font-black text-slate-900 dark:text-white">{user?.name || "مستخدم النظام"}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {roleLabels[user?.role || "viewer"]}
            </p>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex min-h-20 items-center gap-4 border-b border-slate-200 bg-white/90 px-4 pr-16 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90 sm:px-6 sm:pr-16 lg:px-8 lg:pr-8">
          <button
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-black text-slate-900 dark:text-white">{info.title}</h1>
            <p className="truncate text-sm text-slate-500 dark:text-slate-400">{info.subtitle}</p>
          </div>

          <div className="hidden w-72 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-slate-500 dark:border-slate-800 dark:bg-slate-900 xl:flex">
            <Search className="h-4 w-4" />
            <input
              value={headerSearch}
              onChange={(event) => setHeaderSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && headerSearch.trim()) {
                  navigate(`/suppliers?search=${encodeURIComponent(headerSearch.trim())}`);
                }
              }}
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-500 dark:text-slate-200"
              placeholder="بحث سريع داخل الموردين"
            />
          </div>

          <Button
            variant="secondary"
            onClick={() => queryClient.invalidateQueries()}
            title="تحديث البيانات"
          >
            تحديث
          </Button>

          <button
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            title="الإشعارات"
            onClick={() => setMessage("لا توجد إشعارات جديدة حاليًا")}
          >
            <Bell className="h-5 w-5" />
          </button>

          <button
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            onClick={() => setDark((value) => !value)}
            title={dark ? "الوضع الفاتح" : "الوضع الداكن"}
          >
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
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