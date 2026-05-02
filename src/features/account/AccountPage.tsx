import { FormEvent, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { roleLabels } from "../../lib/constants";
import { changeMyPassword, updateMyAccount } from "../../services/authService";
import { useAuth } from "../auth/AuthProvider";
import { Button, Card, Field, Input } from "../../components/shared/Primitives";

export function AccountPage() {
  const { user, refreshUser, setMessage } = useAuth();
  const [profile, setProfile] = useState({ name: user?.name || "", email: user?.email || "", phone: user?.phone || "" });
  const [password, setPassword] = useState({ current: "", next: "", confirm: "" });
  const [error, setError] = useState("");

  const profileMutation = useMutation({
    mutationFn: () => updateMyAccount(profile),
    onSuccess: async () => {
      await refreshUser();
      setMessage("تم تحديث الحساب");
    },
    onError: (err) => setError(err instanceof Error ? err.message : "فشل تحديث الحساب"),
  });

  const passwordMutation = useMutation({
    mutationFn: () => changeMyPassword(password.current, password.next),
    onSuccess: () => {
      setPassword({ current: "", next: "", confirm: "" });
      setMessage("تم تغيير كلمة المرور");
    },
    onError: (err) => setError(err instanceof Error ? err.message : "فشل تغيير كلمة المرور"),
  });

  function saveProfile(event: FormEvent) {
    event.preventDefault();
    setError("");
    profileMutation.mutate();
  }

  function savePassword(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (password.next.length < 8) return setError("كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل");
    if (password.next !== password.confirm) return setError("تأكيد كلمة المرور غير مطابق");
    passwordMutation.mutate();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="p-6">
        <h2 className="text-xl font-black text-white">بيانات الحساب</h2>
        {error && <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>}
        <form onSubmit={saveProfile} className="mt-5 space-y-4">
          <Field label="الاسم"><Input value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} /></Field>
          <Field label="البريد الإلكتروني"><Input dir="ltr" type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} /></Field>
          <Field label="رقم الجوال"><Input dir="ltr" value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} /></Field>
          <Field label="الدور"><Input value={roleLabels[user?.role || "viewer"]} disabled /></Field>
          <Button type="submit" disabled={profileMutation.isPending}>حفظ البيانات</Button>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-black text-white">تغيير كلمة المرور</h2>
        <form onSubmit={savePassword} className="mt-5 space-y-4">
          <Field label="كلمة المرور الحالية"><Input dir="ltr" type="password" value={password.current} onChange={(event) => setPassword({ ...password, current: event.target.value })} /></Field>
          <Field label="كلمة المرور الجديدة"><Input dir="ltr" type="password" value={password.next} onChange={(event) => setPassword({ ...password, next: event.target.value })} /></Field>
          <Field label="تأكيد كلمة المرور"><Input dir="ltr" type="password" value={password.confirm} onChange={(event) => setPassword({ ...password, confirm: event.target.value })} /></Field>
          <Button type="submit" disabled={passwordMutation.isPending}>تغيير كلمة المرور</Button>
        </form>
      </Card>
    </div>
  );
}
