import { FormEvent, useState } from "react";
import { Navigate } from "react-router";
import { Eye, EyeOff, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "./AuthProvider";

function ClinicFeedLogo() {
  return (
    <div className="flex items-center justify-center bg-transparent">
      <img
        src="/clinicfeed-logo.png.svg"
        alt="ClinicFeed"
        className="login-logo-img logo-needs-crop h-24 w-[280px] object-cover object-center drop-shadow-[0_8px_20px_rgba(0,0,0,0.28)]"
        draggable={false}
      />
    </div>
  );
}

export function LoginPage() {
  const { isAuthenticated, login, message } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(message);
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/" replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main dir="rtl" className="min-h-screen overflow-x-hidden bg-[#171E2D] text-[#F4F7FB]">
      <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden border-l border-[#2F394F] bg-[radial-gradient(circle_at_18%_12%,rgba(91,115,232,0.18),transparent_34%),linear-gradient(145deg,#1D2435,#171E2D)] p-10 lg:flex lg:flex-col lg:justify-between">
          <div className="login-reveal flex items-center justify-start">
            <ClinicFeedLogo />
          </div>

          <div className="login-reveal max-w-xl space-y-6 [animation-delay:120ms]">
            <span className="inline-flex rounded-full border border-[#34C38F]/30 bg-[#34C38F]/10 px-4 py-2 text-sm text-[#34C38F]">
              عمليات صحية ومشتريات أكثر وضوحًا
            </span>

            <h2 className="text-5xl font-black leading-tight">
              منصة تشغيلية موحدة لإدارة الموردين، المستندات، الطلبات، ومؤشرات الأداء بكفاءة أعلى.
            </h2>

            <p className="text-lg leading-8 text-[#C3CBE0]">
              دخول آمن بصلاحيات مخصصة لكل دور، مع تنظيم مركزي للبيانات والملفات لتسهيل المتابعة واتخاذ القرار.
            </p>
          </div>

          <div className="login-reveal grid grid-cols-3 gap-4 text-sm text-[#C3CBE0] [animation-delay:220ms]">
            {["JWT", "Supabase", "RTL"].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-[#3A4560] bg-[#1E2638]/80 p-4"
              >
                <ShieldCheck className="mb-3 h-5 w-5 text-emerald-400" />
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center p-5 sm:p-6">
          <form
            onSubmit={handleSubmit}
            autoComplete="off"
            className="w-full max-w-md rounded-3xl border border-[#3A4560] bg-[#242C3F]/95 p-6 shadow-2xl shadow-black/40 sm:p-8"
          >
            <div className="mb-8 text-center">
              <div className="mx-auto mb-6 flex items-center justify-center">
                <ClinicFeedLogo />
              </div>

              <h2 className="text-3xl font-black">تسجيل الدخول</h2>
              <p className="mt-2 text-sm text-[#8E9AB6]">
                ادخل بيانات حسابك للوصول إلى لوحة الموردين.
              </p>
            </div>

            {(error || message) && (
              <div className="mb-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error || message}
              </div>
            )}

            <label className="mb-4 block">
              <span className="mb-2 block text-sm font-bold text-slate-200">
                البريد الإلكتروني
              </span>

              <div className="relative">
                <Mail className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8E9AB6]" />

                <input
                  dir="ltr"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="off"
                  className="h-12 w-full rounded-2xl border border-[#3A4560] bg-[#1E2638] px-4 pr-11 text-left text-[#F4F7FB] outline-none transition focus:border-[#5B73E8] focus:ring-4 focus:ring-[#5B73E8]/15"
                  required
                />
              </div>
            </label>

            <label className="mb-6 block">
              <span className="mb-2 block text-sm font-bold text-slate-200">
                كلمة المرور
              </span>

              <div className="relative">
                <input
                  dir="ltr"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  className="h-12 w-full rounded-2xl border border-[#3A4560] bg-[#1E2638] px-4 pl-11 text-left text-[#F4F7FB] outline-none transition focus:border-[#5B73E8] focus:ring-4 focus:ring-[#5B73E8]/15"
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute left-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#8E9AB6] transition hover:bg-[#323D56] hover:text-white"
                  aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-2xl bg-[#5B73E8] font-black text-white transition hover:bg-[#4F63D2] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "جاري التحقق..." : "دخول المنصة"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
