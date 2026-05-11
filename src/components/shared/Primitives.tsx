import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Inbox, Loader2 } from "lucide-react";
import { expiryState, supplierStatusLabel } from "../../lib/format";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Card({ children, className = "", ...props }: HTMLAttributes<HTMLElement> & { children: ReactNode; className?: string }) {
  return <section {...props} className={cn("rounded-2xl border border-[#3A4560]/80 bg-[#242C3F] shadow-[0_16px_42px_rgba(4,8,18,0.28)] backdrop-blur-sm transition duration-200 ease-out hover:-translate-y-px hover:border-[#5B73E8]/35 hover:bg-[#2A3348]", className)}>{children}</section>;
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  const styles = {
    primary: "bg-[#5B73E8] text-white hover:bg-[#4F63D2] border border-[#6F85F2]/50 shadow-[0_10px_24px_rgba(91,115,232,0.22)]",
    secondary: "border border-[#3A4560] bg-[#1E2638] text-[#C3CBE0] hover:border-[#5B73E8]/45 hover:bg-[#323D56] hover:text-[#F4F7FB]",
    danger: "border border-[#F46A6A]/30 bg-[#F46A6A]/10 text-[#F46A6A] hover:bg-[#F46A6A]/20",
    ghost: "border border-transparent bg-transparent text-[#C3CBE0] hover:bg-[#323D56] hover:text-[#F4F7FB]",
  };

  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold transition duration-200 ease-out hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0",
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
  const isDate = props.type === "date";
  return (
    <input
      {...props}
      placeholder={isDate ? "YYYY-MM-DD" : props.placeholder}
      dir={isDate ? "ltr" : props.dir}
      lang={isDate ? "en" : props.lang}
      className={cn(
        "h-11 w-full rounded-xl border border-[#3A4560] bg-[#1E2638] px-3 text-sm leading-7 text-[#F4F7FB] shadow-inner shadow-black/10 outline-none placeholder:text-[#8E9AB6]/70 focus:border-[#5B73E8] focus:ring-4 focus:ring-[#5B73E8]/15",
        isDate && "text-left",
        props.className,
      )}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn("h-11 w-full rounded-xl border border-[#3A4560] bg-[#1E2638] px-3 text-sm text-[#F4F7FB] shadow-inner shadow-black/10 outline-none focus:border-[#5B73E8] focus:ring-4 focus:ring-[#5B73E8]/15", props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn("min-h-24 w-full rounded-xl border border-[#3A4560] bg-[#1E2638] px-3 py-2 text-sm leading-7 text-[#F4F7FB] shadow-inner shadow-black/10 outline-none placeholder:text-[#8E9AB6]/70 focus:border-[#5B73E8] focus:ring-4 focus:ring-[#5B73E8]/15", props.className)} />;
}

export function Field({ label, children, required = false }: { label: string; children: ReactNode; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-[#C3CBE0]">
        {label} {required && <span className="text-rose-300">*</span>}
      </span>
      {children}
    </label>
  );
}

export function StatusBadge({ status }: { status?: string | null }) {
  const tone =
    status === "Active"
      ? "border-[#34C38F]/30 bg-[#34C38F]/10 text-[#34C38F]"
      : status === "Pending"
        ? "border-[#F1B44C]/30 bg-[#F1B44C]/10 text-[#F1B44C]"
        : status === "Suspended" || status === "Blacklisted"
          ? "border-[#F46A6A]/30 bg-[#F46A6A]/10 text-[#F46A6A]"
          : "border-[#50A5F1]/30 bg-[#50A5F1]/10 text-[#50A5F1]";
  return <span className={cn("inline-flex rounded-full border px-3 py-1 text-xs font-black", tone)}>{supplierStatusLabel(status)}</span>;
}

export function ExpiryBadge({ date }: { date?: string | null }) {
  const state = expiryState(date);
  const tone = {
    success: "border-[#34C38F]/30 bg-[#34C38F]/10 text-[#34C38F]",
    warning: "border-[#F1B44C]/30 bg-[#F1B44C]/10 text-[#F1B44C]",
    danger: "border-[#F46A6A]/30 bg-[#F46A6A]/10 text-[#F46A6A]",
    muted: "border-[#50A5F1]/30 bg-[#50A5F1]/10 text-[#50A5F1]",
  }[state.tone];
  return <span className={cn("inline-flex rounded-full border px-3 py-1 text-xs font-black", tone)}>{state.label}</span>;
}

export function EmptyState({ title = "لا توجد بيانات", subtitle = "ستظهر البيانات هنا عند توفرها.", children }: { title?: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center px-6 py-10 text-center">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-transparent text-[#8E9AB6]">
        <Inbox className="h-5 w-5" />
      </div>
      <p className="font-black text-[#F4F7FB]">{title}</p>
      <p className="mt-2 text-sm leading-7 text-[#8E9AB6]">{subtitle}</p>
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}

export function LoadingState({ label = "جاري تحميل البيانات..." }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-[#C3CBE0]">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span>{label}</span>
    </div>
  );
}

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#101624]/82 p-4 backdrop-blur-md md:items-center">
      <div className="my-4 max-h-[92vh] w-full max-w-4xl animate-[sectionFade_0.2s_ease_both] overflow-hidden rounded-3xl border border-[#3A4560] bg-[#242C3F] shadow-[0_28px_80px_rgba(0,0,0,0.45)]">
        <div className="flex items-center justify-between border-b border-[#2F394F] bg-[#1D2435]/90 px-6 py-4">
          <h2 className="text-lg font-black text-[#F4F7FB]">{title}</h2>
          <Button type="button" variant="ghost" onClick={onClose}>إغلاق</Button>
        </div>
        <div className="max-h-[calc(92vh-4.5rem)] overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
