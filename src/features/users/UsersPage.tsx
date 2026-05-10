import { FormEvent, useState } from "react";
import { Navigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit2, KeyRound, Plus, Search } from "lucide-react";
import { departments, roleLabels } from "../../lib/constants";
import { formatDateTime } from "../../lib/format";
import { canManageUsers } from "../../lib/permissions";
import {
  createUser,
  listUsers,
  resetUserPassword,
  setUserStatus,
  updateUser,
  type UserFormPayload,
} from "../../services/userService";
import { useAuth } from "../auth/AuthProvider";
import type { Role, User } from "../../types";
import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  LoadingState,
  Modal,
  Select,
} from "../../components/shared/Primitives";
import { PhoneNumberInput } from "../../components/shared/PhoneNumberInput";

const roles: Role[] = ["admin", "manager", "operations", "sales", "viewer"];

export function UsersPage() {
  const { user, setMessage } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<User | null | undefined>(undefined);
  const [resetUser, setResetUser] = useState<User | null>(null);

  const usersQuery = useQuery({
    queryKey: ["users", search],
    queryFn: () => listUsers(search),
    enabled: canManageUsers(user?.role),
    staleTime: 30_000,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => setUserStatus(id, active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setMessage("تم تحديث حالة المستخدم");
    },
  });

  if (!canManageUsers(user?.role)) return <Navigate to="/" replace />;

  return (
    <div className="space-y-6">
      {editing !== undefined && (
        <UserModal
          user={editing || null}
          onResetPassword={(selectedUser) => {
            setEditing(undefined);
            setResetUser(selectedUser);
          }}
          onClose={() => setEditing(undefined)}
        />
      )}

      {resetUser && <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} />}

      <Card className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8F99B8]" />

            <Input
              className="pr-9"
              placeholder="بحث باسم المستخدم أو البريد أو الدور"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <Button onClick={() => setEditing(null)}>
            <Plus className="h-4 w-4" />
            إنشاء مستخدم جديد
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {usersQuery.isLoading ? (
          <LoadingState />
        ) : (usersQuery.data || []).length === 0 ? (
          <EmptyState title="لا توجد بيانات مستخدمين" />
        ) : (
          <>
            <div className="grid gap-3 p-4 md:hidden">
              {(usersQuery.data || []).map((employee) => (
                <Card
                  key={employee.id}
                  className="cursor-pointer p-4 transition hover:-translate-y-0.5 hover:bg-[#343B52]"
                  onClick={() => setEditing(employee)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-black text-white">{employee.name}</p>
                      <p className="mt-1 truncate text-sm text-[#B8C1DD]" dir="ltr">
                        {employee.email}
                      </p>
                    </div>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-black ${
                        employee.is_active
                          ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-200"
                          : "border-rose-500/30 bg-rose-500/15 text-rose-200"
                      }`}
                    >
                      {employee.is_active ? "مفعّل" : "معطّل"}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs font-bold text-[#8F99B8]">الدور</p>
                      <p className="mt-1 font-black text-[#F3F6F9]">
                        {roleLabels[employee.role]}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-[#8F99B8]">الجوال</p>
                      <p className="mt-1 font-black text-[#F3F6F9]" dir="ltr">
                        {employee.phone || "-"}
                      </p>
                    </div>

                    <div className="col-span-2">
                      <p className="text-xs font-bold text-[#8F99B8]">آخر دخول</p>
                      <p className="mt-1 font-black text-[#F3F6F9]">
                        {formatDateTime(employee.last_login_at)}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="hidden md:block">
              <table className="w-full table-fixed text-right text-sm">
                <thead className="bg-[#252B3A] text-[#B8C1DD]">
                  <tr>
                    <th className="w-[22%] px-5 py-4 font-black">المستخدم</th>
                    <th className="w-[28%] px-5 py-4 font-black">البريد الإلكتروني</th>
                    <th className="w-[16%] px-5 py-4 font-black">رقم الجوال</th>
                    <th className="w-[14%] px-5 py-4 font-black">الدور</th>
                    <th className="w-[10%] px-5 py-4 font-black">الحالة</th>
                    <th className="w-[10%] px-5 py-4 font-black">آخر دخول</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#30364A]">
                  {(usersQuery.data || []).map((employee) => (
                    <tr
                      key={employee.id}
                      onClick={() => setEditing(employee)}
                      className="cursor-pointer transition hover:bg-[#343B52] [&>td]:transition-colors"
                    >
                      <td className="truncate px-5 py-4 font-black text-white">
                        {employee.name}
                      </td>
                      <td className="truncate px-5 py-4 text-[#B8C1DD]" dir="ltr">
                        {employee.email}
                      </td>
                      <td className="truncate px-5 py-4 text-[#B8C1DD]" dir="ltr">
                        {employee.phone || "-"}
                      </td>
                      <td className="truncate px-5 py-4 text-[#B8C1DD]">
                        {roleLabels[employee.role]}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-black ${
                            employee.is_active
                              ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-200"
                              : "border-rose-500/30 bg-rose-500/15 text-rose-200"
                          }`}
                        >
                          {employee.is_active ? "مفعّل" : "معطّل"}
                        </span>
                      </td>

                      <td className="truncate px-5 py-4 text-[#B8C1DD]">
                        {formatDateTime(employee.last_login_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

function UserModal({
  user,
  onResetPassword,
  onClose,
}: {
  user?: User | null;
  onResetPassword: (user: User) => void;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    password: "",
    confirmPassword: "",
    role: user?.role || "viewer",
    department_or_task: user?.department_or_task || "إدارة الموردين",
    is_active: user?.is_active ?? true,
  });

  const mutation = useMutation({
    mutationFn: () => {
      const payload: UserFormPayload = {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role as Role,
        is_active: Boolean(form.is_active),
      };

      if (!user) {
        payload.password = form.password;
      }

      return user ? updateUser(user.id, payload) : createUser(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onClose();
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "";

      if (message.includes("Validation failed")) {
        setError(
          "تحقق من الاسم والبريد الإلكتروني والدور وكلمة المرور. لا يمكن إرسال حقول غير مدعومة."
        );
        return;
      }

      setError(message || "فشل حفظ المستخدم");
    },
  });

  function submit(event: FormEvent) {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("الاسم مطلوب");
      return;
    }

    if (!form.email.trim()) {
      setError("البريد الإلكتروني مطلوب");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError("البريد الإلكتروني غير صحيح");
      return;
    }

    if (!form.role) {
      setError("الدور مطلوب");
      return;
    }

    if (!user && form.password.length < 8) {
      setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      return;
    }

    if (!user && form.password !== form.confirmPassword) {
      setError("تأكيد كلمة المرور غير مطابق");
      return;
    }

    setError("");
    mutation.mutate();
  }

  return (
    <Modal title={user ? "تعديل مستخدم" : "إنشاء مستخدم جديد"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="الاسم" required>
            <Input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </Field>

          <Field label="البريد الإلكتروني" required>
            <Input
              dir="ltr"
              type="email"
              disabled={Boolean(user)}
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </Field>

          <Field label="رقم الجوال">
            <PhoneNumberInput
              value={form.phone}
              onChange={(phone) => setForm({ ...form, phone })}
            />
          </Field>

          <Field label="الدور" required>
            <Select
              value={form.role}
              onChange={(event) => setForm({ ...form, role: event.target.value as Role })}
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="القسم / المهمة">
            <Select
              value={form.department_or_task}
              onChange={(event) =>
                setForm({ ...form, department_or_task: event.target.value })
              }
            >
              {departments.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="الحالة">
            <Select
              value={String(form.is_active)}
              onChange={(event) =>
                setForm({ ...form, is_active: event.target.value === "true" })
              }
            >
              <option value="true">مفعّل</option>
              <option value="false">معطّل</option>
            </Select>
          </Field>

          {!user && (
            <>
              <Field label="كلمة المرور المؤقتة" required>
                <Input
                  dir="ltr"
                  type="password"
                  value={form.password}
                  onChange={(event) =>
                    setForm({ ...form, password: event.target.value })
                  }
                />
              </Field>

              <Field label="تأكيد كلمة المرور" required>
                <Input
                  dir="ltr"
                  type="password"
                  value={form.confirmPassword}
                  onChange={(event) =>
                    setForm({ ...form, confirmPassword: event.target.value })
                  }
                />
              </Field>
            </>
          )}
        </div>

        <div className="rounded-xl border border-[#30364A] bg-[#242A39] p-3 text-xs leading-6 text-[#8F99B8]">
          ملاحظة: رقم الجوال والقسم/المهمة محفوظان للواجهة فقط حاليًا، ولا يتم إرسالهما
          للباكند لأن مسار المستخدمين الحالي لا يدعم هذه الحقول.
        </div>

        <div className="flex flex-wrap justify-between gap-2">
          <div>
            {user && (
              <Button type="button" variant="secondary" onClick={() => onResetPassword(user)}>
                <KeyRound className="h-4 w-4" />
                إعادة كلمة المرور
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              إلغاء
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function ResetPasswordModal({ user, onClose }: { user: User; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () => resetUserPassword(user.id, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onClose();
    },
    onError: (err) =>
      setError(err instanceof Error ? err.message : "فشل إعادة تعيين كلمة المرور"),
  });

  function submit(event: FormEvent) {
    event.preventDefault();

    if (password.length < 8) {
      setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      return;
    }

    if (password !== confirm) {
      setError("تأكيد كلمة المرور غير مطابق");
      return;
    }

    setError("");
    mutation.mutate();
  }

  return (
    <Modal title={`إعادة تعيين كلمة المرور - ${user.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-200">
            {error}
          </div>
        )}

        <Field label="كلمة المرور المؤقتة" required>
          <Input
            dir="ltr"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>

        <Field label="تأكيد كلمة المرور" required>
          <Input
            dir="ltr"
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
          />
        </Field>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "جاري الحفظ..." : "حفظ كلمة المرور"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}