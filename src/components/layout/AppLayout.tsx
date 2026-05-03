import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router";
import { Activity, Bell, LayoutDashboard, LogOut, Menu, Moon, Search, Settings, Sun, UserCircle, Users, X } from "lucide-react";
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
  if (pathname === "/") return { title: "لوحة التحكم", subtitle: "نظرة تشغيلية على الموردين والمؤشرات والتنبيهات" };
  if (pathname.startsWith("/suppliers/")) return { title: "ملف المورد", subtitle: "البيانات، العقود، المستندات، وجهات الاتصال" };
  if (pathname === "/suppliers") return { title: "الموردين", subtitle: "إدارة الموردين والبحث والتصفية والمتابعة" };
  if (pathname === "/users") return { title: "إدارة المستخدمين", subtitle: "حسابات الموظفين والأدوار والصلاحيات" };
  if (pathname === "/activity") return { title: "سجل النشاط", subtitle: "آخر العمليات المسجلة في النظام" };
  if (pathname === "/account") return { title: "حسابي", subtitle: "بيانات الحساب وتغيير كلمة المرور" };
  return { title: "ClinicFeed", subtitle: "منصة إدارة الموردين الداخلية" };
}

export function AppLayout() {
  const { user, isAuthenticated, isLoading, logout, message, setMessage } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState("");
  const [dark, setDark] = useState(() => localStorage.getItem(THEME_KEY) !== "light");
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
  }, [dark]);

  const navigation = useMemo(() => {
    const items = [...baseNavigation];
    if (canManageUsers(user?.role)) items.splice(2, 0, { name: "المستخدمين", href: "/users", icon: Settings });
    return items;
  }, [user?.role]);

  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-[#0F172A] text-slate-300">جاري تحميل النظام...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const info = pageInfo(location.pathname);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div dir="rtl" className="flex min-h-screen bg-[#0F172A] text-slate-100">
      {message && (
        <div className="fixed left-6 top-24 z-[60] rounded-2xl border border-blue-500/30 bg-blue-950 px-4 py-3 text-sm font-bold text-blue-100 shadow-xl">
          {message}
        </div>
      )}
      {sidebarOpen && <button className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="إغلاق القائمة" />}

      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-[270px] flex-col border-l border-slate-800 bg-slate-950 transition-transform duration-200 lg:sticky lg:top-0 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex h-20 items-center justify-between border-b border-slate-800 px-5">
          <Link to="/" className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-800 text-white shadow-lg shadow-blue-950/50">
              <Activity className="h-6 w-6" />
            </span>
            <span>
<div className="flex items-center justify-center py-4">
  <img
    src="/clinicfeed-logo.png.svg"
    alt="ClinicFeed"
    className="h-16 w-auto object-contain"
  />
</div>              <span className="block text-xs text-slate-500">Supplier Management</span>
            </span>
          </Link>
          <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-900 lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto p-4">
          {navigation.map((item) => {
            const active = location.pathname === item.href || (item.href !== "/" && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition",
                  active ? "bg-blue-900/70 text-white ring-1 ring-blue-700/60" : "text-slate-400 hover:bg-slate-900 hover:text-white",
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 p-4">
          <div className="rounded-2xl border border-slate-800 bg-[#111827] p-4">
            <p className="font-black text-white">{user?.name || "مستخدم النظام"}</p>
            <p className="mt-1 text-xs text-slate-500">{roleLabels[user?.role || "viewer"]}</p>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex min-h-20 items-center gap-4 border-b border-slate-800 bg-[#0F172A]/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <button className="rounded-xl border border-slate-800 bg-[#111827] p-2 text-slate-300 lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-black text-white">{info.title}</h1>
            <p className="truncate text-sm text-slate-500">{info.subtitle}</p>
          </div>

          <div className="hidden w-72 items-center gap-2 rounded-2xl border border-slate-800 bg-[#111827] px-3 py-2 text-slate-500 xl:flex">
            <Search className="h-4 w-4" />
            <input
              value={headerSearch}
              onChange={(event) => setHeaderSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && headerSearch.trim()) {
                  navigate(`/suppliers?search=${encodeURIComponent(headerSearch.trim())}`);
                }
              }}
              className="w-full bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-500"
              placeholder="بحث سريع داخل الموردين"
            />
          </div>

          <Button variant="secondary" onClick={() => queryClient.invalidateQueries()} title="تحديث البيانات">
            تحديث
          </Button>
          <button className="rounded-xl border border-slate-800 bg-[#111827] p-2 text-slate-300 hover:bg-slate-800" title="الإشعارات" onClick={() => setMessage("لا توجد إشعارات جديدة حاليًا")}>
            <Bell className="h-5 w-5" />
          </button>
          <button className="rounded-xl border border-slate-800 bg-[#111827] p-2 text-slate-300 hover:bg-slate-800" onClick={() => setDark((value) => !value)}>
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            خروج
          </Button>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
