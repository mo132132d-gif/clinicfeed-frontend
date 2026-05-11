import { FormEvent, useState } from "react";
import { Navigate } from "react-router";
import { ClipboardCheck, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Truck } from "lucide-react";
import { useAuth } from "./AuthProvider";

function ClinicFeedLogo() {
  return (
    <img
      src="/clinicfeed-logo-transparent.png"
      alt="ClinicFeed"
      className="h-20 w-auto max-w-[260px] object-contain"
      draggable={false}
    />
  );
}

const loginHighlights = [
  { label: "دخول آمن", description: "صلاحيات واضحة لكل مستخدم", icon: ShieldCheck },
  { label: "إدارة الموردين", description: "ملفات، مستندات، ومتابعة مركزية", icon: Truck },
  { label: "تتبع الطلبات", description: "رؤية أسرع لحالة الطلبات والإجراءات", icon: ClipboardCheck },
];

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
    <main dir="rtl" className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_12%_12%,rgba(80,165,241,0.14),transparent_30%),radial-gradient(circle_at_88%_4%,rgba(52,195,143,0.10),transparent_24%),linear-gradient(135deg,#101827_0%,#151D2C_46%,#0D1422_100%)] text-[#F4F7FB]">
      <div className="grid min-h-screen lg:grid-cols-[1fr_0.95fr]">
        <section className="hidden border-l border-[#2F394F]/80 bg-[linear-gradient(145deg,rgba(29,36,53,0.92),rgba(16,24,39,0.94))] p-10 lg:flex lg:flex-col lg:justify-center">
          <div className="login-reveal max-w-xl space-y-7">
            <span className="inline-flex rounded-full border border-[#50A5F1]/30 bg-[#50A5F1]/10 px-4 py-2 text-sm font-bold text-[#8FD0FF]">
              ClinicFeed Operations
            </span>

            <h2 className="max-w-lg text-4xl font-black leading-[1.25] text-white">
              دخول موحد لإدارة الموردين والطلبات بوضوح واحترافية.
            </h2>

            <p className="max-w-lg text-base leading-8 text-[#C3CBE0]">
              منصة مصممة لفرق التشغيل والمشتريات في القطاع الصحي لمتابعة الموردين، المستندات، وطلبات السداد من مكان واحد.
            </p>

            <div className="grid gap-3 pt-2">
              {loginHighlights.map((item) => (
                <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-[#3A4560]/80 bg-[#1E2638]/70 p-4 shadow-[0_14px_32px_rgba(3,7,18,0.20)]">
                  <div className="grid h-11 w-11 place-items-center rounded-xl border border-[#50A5F1]/25 bg-[#50A5F1]/10 text-[#50A5F1]">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-black text-white">{item.label}</p>
                    <p className="mt-1 text-sm text-[#8E9AB6]">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center p-4 sm:p-6 lg:p-10">
          <form
            onSubmit={handleSubmit}
            autoComplete="off"
            className="login-reveal w-full max-w-[440px] rounded-[2rem] border border-[#3A4560]/80 bg-[#242C3F]/92 p-6 shadow-[0_28px_80px_rgba(3,7,18,0.46)] backdrop-blur-xl sm:p-8"
          >
            <div className="mb-7 text-center">
              <div className="mx-auto mb-5 flex items-center justify-center">
                <ClinicFeedLogo />
              </div>

              <h2 className="text-3xl font-black tracking-tight text-white">تسجيل الدخول</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#AEB8D4]">
                أدخل بيانات حسابك للوصول إلى لوحة ClinicFeed التشغيلية.
              </p>
            </div>

            {(error || message) && (
              <div className="mb-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error || message}
              </div>
            )}

            <label className="mb-4 block">
              <span className="mb-2 block text-sm font-bold text-[#DCE4F5]">
                البريد الإلكتروني
              </span>

              <div className="relative">
                <Mail className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8E9AB6]" />

                <input
                  dir="ltr"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="off"
                  className="h-[52px] w-full rounded-2xl border border-[#3A4560] bg-[#1B2435] px-4 pr-12 text-left text-[#F4F7FB] outline-none transition placeholder:text-[#707A99] hover:border-[#4B5875] focus:border-[#50A5F1] focus:ring-4 focus:ring-[#50A5F1]/15"
                  required
                />
              </div>
            </label>

            <label className="mb-6 block">
              <span className="mb-2 block text-sm font-bold text-[#DCE4F5]">
                كلمة المرور
              </span>

              <div className="relative">
                <LockKeyhole className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8E9AB6]" />

                <input
                  dir="ltr"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  className="h-[52px] w-full rounded-2xl border border-[#3A4560] bg-[#1B2435] px-4 pl-12 pr-12 text-left text-[#F4F7FB] outline-none transition placeholder:text-[#707A99] hover:border-[#4B5875] focus:border-[#50A5F1] focus:ring-4 focus:ring-[#50A5F1]/15"
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-[#8E9AB6] transition hover:bg-[#323D56] hover:text-white"
                  aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="h-[52px] w-full rounded-2xl bg-gradient-to-l from-[#50A5F1] to-[#34C38F] font-black text-white shadow-[0_16px_34px_rgba(80,165,241,0.24)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "جاري التحقق..." : "دخول المنصة"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
