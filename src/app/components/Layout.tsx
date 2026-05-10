import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard,
  Users,
  Bell,
  Database,
  Activity,
  Settings,
  RefreshCw,
  LogOut,
  User,
  Menu,
  X,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navigation = [
  { name: "لوحة التحكم", href: "/", icon: LayoutDashboard },
  { name: "الموردون", href: "/suppliers", icon: Users },
  { name: "التنبيهات", href: "/alerts", icon: Bell },
  { name: "البيانات المفقودة", href: "/missing-data", icon: Database },
  { name: "سجل النشاط", href: "/activity", icon: Activity },
  { name: "الإعدادات", href: "/settings", icon: Settings },
];

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = "dark";
    localStorage.removeItem("theme");
  }, []);

  function handleRefresh() {
    window.location.reload();
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
    navigate("/");
    window.location.reload();
  }

  const getPageTitle = () => {
    const route = navigation.find((n) => n.href === location.pathname);

    if (route) {
      return {
        title: route.name,
        desc: `نظرة عامة على ${route.name}`,
      };
    }

    if (location.pathname.startsWith("/suppliers/")) {
      return {
        title: "ملف المورد",
        desc: "تفاصيل المورد والعقود والمستندات",
      };
    }

    return {
      title: "المنصة الداخلية",
      desc: "نظام إدارة الموردين",
    };
  };

  const headerInfo = getPageTitle();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={cn(
          "fixed inset-y-0 start-0 z-50 flex w-72 flex-col bg-brand-900 text-white transition-transform lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex items-center justify-center border-b border-brand-800 bg-transparent px-4 py-5">
          <Link to="/" className="flex flex-1 items-center justify-center bg-transparent px-4 py-5">
            <img
              src="/clinicfeed-logo.png.svg"
              alt="ClinicFeed"
              className="sidebar-logo-img logo-needs-crop h-16 w-[190px] object-cover object-center"
            />
          </Link>

          <button
            className="lg:hidden text-slate-300 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-6 overflow-y-auto">
          {navigation.map((item) => {
            const isActive =
              location.pathname === item.href ||
              (item.href !== "/" && location.pathname.startsWith(item.href));

            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "group flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary-500 text-white shadow-sm"
                    : "text-slate-300 hover:bg-brand-800 hover:text-white"
                )}
              >
                <item.icon
                  className={cn(
                    "me-3 h-5 w-5 flex-shrink-0",
                    isActive
                      ? "text-white"
                      : "text-slate-400 group-hover:text-white"
                  )}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-brand-800">
          <div className="flex items-center w-full px-4 py-3 text-sm font-medium text-slate-300 rounded-xl bg-brand-800">
            <User className="me-3 h-5 w-5 text-primary-500" />
            <div className="text-start">
              <p className="text-white">Admin</p>
              <p className="text-xs text-slate-400">مدير النظام</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-20 flex-shrink-0 items-center gap-x-4 border-b border-slate-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8 dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-slate-700 lg:hidden dark:text-slate-200"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">فتح القائمة الجانبية</span>
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6 justify-between items-center">
            <div className="flex flex-col justify-center">
              <h1 className="text-xl font-bold text-slate-900 leading-tight dark:text-white">
                {headerInfo.title}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {headerInfo.desc}
              </p>
            </div>

            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <button
                onClick={handleRefresh}
                className="p-2 text-slate-400 hover:text-primary-600 transition-colors bg-slate-50 hover:bg-primary-50 rounded-full dark:bg-slate-800 dark:hover:bg-slate-700"
                title="تحديث البيانات"
              >
                <RefreshCw size={20} />
              </button>

              <div
                className="hidden lg:block h-6 w-px bg-slate-200 dark:bg-slate-700"
                aria-hidden="true"
              />

              <div className="flex items-center gap-x-4 cursor-pointer hover:bg-slate-50 p-1.5 rounded-lg transition-colors border border-transparent hover:border-slate-200 dark:hover:bg-slate-800 dark:hover:border-slate-700">
                <div className="bg-primary-100 p-2 rounded-full text-primary-600 dark:bg-primary-900/40">
                  <User size={20} />
                </div>
                <div className="hidden md:block text-start">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Admin
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    مدير النظام
                  </p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="hidden sm:flex items-center gap-2 p-2 text-slate-400 hover:text-danger-600 transition-colors bg-slate-50 hover:bg-danger-50 rounded-lg text-sm font-medium dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                <LogOut size={18} />
                <span>خروج</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8 dark:bg-slate-950">
          <Outlet />
        </main>
      </div>
    </div>
  );
}


