import { FormEvent, useState } from "react";
import { Navigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit2, KeyRound, Plus, Search } from "lucide-react";
import { departments, roleLabels } from "../../lib/constants";
import { formatDateTime } from "../../lib/format";
import { canManageUsers } from "../../lib/permissions";
import { createUser, listUsers, resetUserPassword, setUserStatus, updateUser, type UserFormPayload } from "../../services/userService";
import { useAuth } from "../auth/AuthProvider";
import type { Role, User } from "../../types";
import { Button, Card, EmptyState, Field, Input, LoadingState, Modal, Select } from "../../components/shared/Primitives";

const roles: Role[] = ["admin", "manager", "operations", "sales", "viewer"];

export function UsersPage() {
  const { user, setMessage } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<User | null | undefined>(undefined);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const usersQuery = useQuery({ queryKey: ["users", search], queryFn: () => listUsers(search), enabled: canManageUsers(user?.role), staleTime: 30_000 });

  const statusMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => setUserStatus(id, active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setMessage("طھظ… طھط­ط¯ظٹط« ط­ط§ظ„ط© ط§ظ„ظ…ط³طھط®ط¯ظ…");
    },
  });

  if (!canManageUsers(user?.role)) return <Navigate to="/" replace />;

  return (
    <div className="space-y-6">
      {editing !== undefined && <UserModal user={editing || null} onClose={() => setEditing(undefined)} />}
      {resetUser && <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} />}

      <Card className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input className="pr-9" placeholder="ط¨ط­ط« ط¨ط§ط³ظ… ط§ظ„ظ…ط³طھط®ط¯ظ… ط£ظˆ ط§ظ„ط¨ط±ظٹط¯ ط£ظˆ ط§ظ„ط¯ظˆط±" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <Button onClick={() => setEditing(null)}><Plus className="h-4 w-4" />ط¥ظ†ط´ط§ط، ظ…ط³طھط®ط¯ظ… ط¬ط¯ظٹط¯</Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {usersQuery.isLoading ? <LoadingState /> : (usersQuery.data || []).length === 0 ? <EmptyState title="ظ„ط§ طھظˆط¬ط¯ ط¨ظٹط§ظ†ط§طھ ظ…ط³طھط®ط¯ظ…ظٹظ†" /> : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed table-fixed text-right text-sm">
              <thead className="bg-slate-950 text-slate-400">
                <tr>{["ط§ظ„ظ…ط³طھط®ط¯ظ…", "ط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ", "ط±ظ‚ظ… ط§ظ„ط¬ظˆط§ظ„", "ط§ظ„ط¯ظˆط±", "ط§ظ„ط­ط§ظ„ط©", "ط¢ط®ط± ط¯ط®ظˆظ„", "ط§ظ„ط¥ط¬ط±ط§ط،ط§طھ"].map((head) => <th key={head} className="px-3 py-3 font-black">{head}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {(usersQuery.data || []).map((employee) => (
                  <tr key={employee.id} className="hover:bg-slate-900">
                    <td className="whitespace-normal px-3 py-3 font-black text-white">{employee.name}</td>
                    <td className="whitespace-normal px-3 py-3 text-slate-400" dir="ltr">{employee.email}</td>
                    <td className="whitespace-normal px-3 py-3 text-slate-400" dir="ltr">{employee.phone || "-"}</td>
                    <td className="whitespace-normal px-3 py-3 text-slate-300">{roleLabels[employee.role]}</td>
                    <td className="whitespace-normal px-3 py-3">{employee.is_active ? "ظ…ظپط¹ظ‘ظ„" : "ظ…ط¹ط·ظ‘ظ„"}</td>
                    <td className="whitespace-normal px-3 py-3 text-slate-400">{formatDateTime(employee.last_login_at)}</td>
                    <td className="whitespace-normal px-3 py-3">
                      <div className="flex flex-nowrap gap-2">
                        <Button variant="secondary" onClick={() => setEditing(employee)}><Edit2 className="h-4 w-4" />طھط¹ط¯ظٹظ„</Button>
                        <Button variant={employee.is_active ? "danger" : "secondary"} onClick={() => statusMutation.mutate({ id: employee.id, active: !employee.is_active })}>{employee.is_active ? "طھط¹ط·ظٹظ„" : "طھظپط¹ظٹظ„"}</Button>
                        <Button variant="secondary" onClick={() => setResetUser(employee)}><KeyRound className="h-4 w-4" />ط¥ط¹ط§ط¯ط© ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط±</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function UserModal({ user, onClose }: { user?: User | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    password: "",
    confirmPassword: "",
    role: user?.role || "viewer",
    department_or_task: user?.department_or_task || "ط¥ط¯ط§ط±ط© ط§ظ„ظ…ظˆط±ط¯ظٹظ†",
    is_active: user?.is_active ?? true,
  });

  const mutation = useMutation({
    mutationFn: () => {
      const payload: UserFormPayload = {
        name: form.name,
        email: form.email,
        role: form.role as Role,
        is_active: form.is_active,
      };
      if (!user) payload.password = form.password;
      return user ? updateUser(user.id, payload) : createUser(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onClose();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "ظپط´ظ„ ط­ظپط¸ ط§ظ„ظ…ط³طھط®ط¯ظ…"),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) return setError("ط§ظ„ط§ط³ظ… ظ…ط·ظ„ظˆط¨");
    if (!form.email.trim()) return setError("ط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ ظ…ط·ظ„ظˆط¨");
    if (!user && !form.password) return setError("ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ط§ظ„ظ…ط¤ظ‚طھط© ظ…ط·ظ„ظˆط¨ط©");
    if (!user && form.password !== form.confirmPassword) return setError("طھط£ظƒظٹط¯ ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ط؛ظٹط± ظ…ط·ط§ط¨ظ‚");
    mutation.mutate();
  }

  return (
    <Modal title={user ? "طھط¹ط¯ظٹظ„ ظ…ط³طھط®ط¯ظ…" : "ط¥ظ†ط´ط§ط، ظ…ط³طھط®ط¯ظ… ط¬ط¯ظٹط¯"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>}
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="ط§ظ„ط§ط³ظ…" required><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="ط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ" required><Input dir="ltr" type="email" disabled={Boolean(user)} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="ط±ظ‚ظ… ط§ظ„ط¬ظˆط§ظ„"><Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="ط§ظ„ط¯ظˆط±" required><Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>{roles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</Select></Field>
          <Field label="ط§ظ„ظ‚ط³ظ… / ط§ظ„ظ…ظ‡ظ…ط©"><Select value={form.department_or_task} onChange={(e) => setForm({ ...form, department_or_task: e.target.value })}>{departments.map((item) => <option key={item} value={item}>{item}</option>)}</Select></Field>
          <Field label="ط§ظ„ط­ط§ظ„ط©"><Select value={String(form.is_active)} onChange={(e) => setForm({ ...form, is_active: e.target.value === "true" })}><option value="true">ظ…ظپط¹ظ‘ظ„</option><option value="false">ظ…ط¹ط·ظ‘ظ„</option></Select></Field>
          {!user && <><Field label="ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ط§ظ„ظ…ط¤ظ‚طھط©" required><Input dir="ltr" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field><Field label="طھط£ظƒظٹط¯ ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط±" required><Input dir="ltr" type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} /></Field></>}
        </div>
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>ط¥ظ„ط؛ط§ط،</Button><Button type="submit" disabled={mutation.isPending}>ط­ظپط¸</Button></div>
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
    onError: (err) => setError(err instanceof Error ? err.message : "ظپط´ظ„ ط¥ط¹ط§ط¯ط© طھط¹ظٹظٹظ† ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط±"),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (password.length < 8) return setError("ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ظٹط¬ط¨ ط£ظ† طھظƒظˆظ† 8 ط£ط­ط±ظپ ط¹ظ„ظ‰ ط§ظ„ط£ظ‚ظ„");
    if (password !== confirm) return setError("طھط£ظƒظٹط¯ ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ط؛ظٹط± ظ…ط·ط§ط¨ظ‚");
    mutation.mutate();
  }

  return <Modal title={`ط¥ط¹ط§ط¯ط© طھط¹ظٹظٹظ† ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± - ${user.name}`} onClose={onClose}><form onSubmit={submit} className="space-y-4">{error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-200">{error}</div>}<Field label="ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ط§ظ„ظ…ط¤ظ‚طھط©" required><Input dir="ltr" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field><Field label="طھط£ظƒظٹط¯ ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط±" required><Input dir="ltr" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></Field><div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>ط¥ظ„ط؛ط§ط،</Button><Button type="submit" disabled={mutation.isPending}>ط­ظپط¸ ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط±</Button></div></form></Modal>;
}

