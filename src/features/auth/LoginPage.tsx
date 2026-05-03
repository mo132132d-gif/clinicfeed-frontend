import { FormEvent, useState } from "react";
import { Navigate } from "react-router";
import { Activity, Lock, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "./AuthProvider";

export function LoginPage() {
  const { isAuthenticated, login, message } = useAuth();
  const [email, setEmail] = useState("admin@clinicfeed.com");
  const [password, setPassword] = useState("Admin123!");
  const [error, setError] = useState(message);
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/" replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#0F172A] text-white">
      <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden border-l border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950/80 p-10 lg:flex lg:flex-col lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-700 p-3 shadow-lg shadow-blue-950/50">
              <Activity className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold">ClinicFeed</h1>
              <p className="text-sm text-slate-400">منصة إدارة الموردين الداخلية</p>
            </div>
          </div>

          <div className="max-w-xl space-y-6">
            <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
              عمليات صحية ومشتريات أكثر وضوحًا
            </span>
            <h2 className="text-5xl font-black leading-tight">
              لوحة تحكم مؤسسية لمتابعة الموردين، العقود، المستندات، ومؤشرات الأداء.
            </h2>
            <p className="text-lg leading-8 text-slate-300">
              تسجيل دخول آمن، صلاحيات حسب الدور، وتنظيم كامل لملفات الموردين استعدادًا للعرض التشغيلي.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm text-slate-300">
            {["JWT", "Supabase", "RTL"].map((item) => (
              <div key={item} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <ShieldCheck className="mb-3 h-5 w-5 text-emerald-400" />
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center p-6">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/95 p-8 shadow-2xl shadow-slate-950/60"
          >
            <div className="mb-8">
              <div className="mb-4 inline-flex rounded-2xl bg-blue-700 p-3">
                <Lock className="h-6 w-6" />
              </div>
              <h2 className="text-3xl font-black">تسجيل الدخول</h2>
              <p className="mt-2 text-sm text-slate-400">ادخل بيانات حسابك للوصول إلى لوحة الموردين.</p>
            </div>

            {(error || message) && (
              <div className="mb-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error || message}
              </div>
            )}

            <label className="mb-4 block">
              <span className="mb-2 block text-sm font-bold text-slate-200">البريد الإلكتروني</span>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                <input
                  dir="ltr"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 pr-11 text-left text-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  required
                />
              </div>
            </label>

            <label className="mb-6 block">
              <span className="mb-2 block text-sm font-bold text-slate-200">كلمة المرور</span>
              <input
                dir="ltr"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 text-left text-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                required
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-2xl bg-blue-800 font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "جاري التحقق..." : "دخول المنصة"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
