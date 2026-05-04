import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { expiryState, supplierStatusLabel } from "../../lib/format";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#111827]", className)}>{children}</section>;
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  const styles = {
    primary: "bg-blue-700 text-white hover:bg-blue-600 border border-blue-700",
    secondary: "border border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700",
    danger: "border border-rose-500/30 bg-rose-500/10 text-rose-700 hover:bg-rose-500/20 dark:text-rose-200",
    ghost: "border border-transparent bg-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
  };

  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60",
        styles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn("h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white", props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn("h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white", props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn("min-h-24 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white", props.className)} />;
}

export function Field({ label, children, required = false }: { label: string; children: ReactNode; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
        {label} {required && <span className="text-rose-300">*</span>}
      </span>
      {children}
    </label>
  );
}

export function StatusBadge({ status }: { status?: string | null }) {
  const tone =
    status === "Active"
      ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-200"
      : status === "Pending"
        ? "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-200"
        : status === "Suspended" || status === "Blacklisted"
          ? "border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-200"
          : "border-slate-500/40 bg-slate-200 text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200";
  return <span className={cn("inline-flex rounded-full border px-3 py-1 text-xs font-black", tone)}>{supplierStatusLabel(status)}</span>;
}

export function ExpiryBadge({ date }: { date?: string | null }) {
  const state = expiryState(date);
  const tone = {
    success: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-200",
    warning: "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-200",
    danger: "border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-200",
    muted: "border-slate-500/40 bg-slate-200 text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200",
  }[state.tone];
  return <span className={cn("inline-flex rounded-full border px-3 py-1 text-xs font-black", tone)}>{state.label}</span>;
}

export function EmptyState({ title = "لا توجد بيانات", subtitle = "ستظهر البيانات هنا عند توفرها." }) {
  return (
    <div className="py-12 text-center">
      <p className="font-black text-slate-700 dark:text-slate-200">{title}</p>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
    </div>
  );
}

export function LoadingState({ label = "جاري تحميل البيانات..." }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-slate-500 dark:text-slate-400">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span>{label}</span>
    </div>
  );
}

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm dark:bg-slate-950/70 md:items-center">
      <div className="my-4 max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#111827]">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h2 className="text-lg font-black text-slate-900 dark:text-white">{title}</h2>
          <Button type="button" variant="ghost" onClick={onClose}>إغلاق</Button>
        </div>
        <div className="max-h-[calc(92vh-4.5rem)] overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
