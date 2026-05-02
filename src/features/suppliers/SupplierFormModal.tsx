import { FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { categoryOptions, supplierStatuses } from "../../lib/constants";
import { parseCategories, serializeCategories } from "../../lib/format";
import { createSupplier, updateSupplier } from "../../services/supplierService";
import type { Supplier } from "../../types";
import { Button, Field, Input, Modal, Select, Textarea } from "../../components/shared/Primitives";

export function SupplierFormModal({ supplier, onClose }: { supplier?: Supplier | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name_ar: supplier?.name_ar || "",
    name_en: supplier?.name_en || "",
    cr_number: supplier?.cr_number || "",
    vat_number: supplier?.vat_number || "",
    city: supplier?.city || "",
    categories: parseCategories(supplier?.category),
    status: supplier?.status || "Pending",
    notes: supplier?.notes || "",
  });
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        name_ar: form.name_ar,
        name_en: form.name_en || form.name_ar,
        cr_number: form.cr_number || null,
        vat_number: form.vat_number || null,
        city: form.city || null,
        category: serializeCategories(form.categories),
        status: form.status,
        notes: form.notes || null,
      } as Partial<Supplier>;
      return supplier ? updateSupplier(supplier.id, payload) : createSupplier(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      onClose();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "فشل حفظ المورد"),
  });

  function toggleCategory(category: string) {
    setForm((current) => ({
      ...current,
      categories: current.categories.includes(category)
        ? current.categories.filter((item) => item !== category)
        : [...current.categories, category],
    }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.name_ar.trim()) {
      setError("اسم المورد بالعربي مطلوب");
      return;
    }
    if (!form.status) {
      setError("الحالة مطلوبة");
      return;
    }
    mutation.mutate();
  }

  return (
    <Modal title={supplier ? "تعديل مورد" : "إضافة مورد"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>}
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="اسم المورد عربي" required>
            <Input value={form.name_ar} onChange={(event) => setForm({ ...form, name_ar: event.target.value })} />
          </Field>
          <Field label="اسم المورد إنجليزي">
            <Input dir="ltr" value={form.name_en} onChange={(event) => setForm({ ...form, name_en: event.target.value })} />
          </Field>
          <Field label="رقم السجل التجاري">
            <Input dir="ltr" value={form.cr_number} onChange={(event) => setForm({ ...form, cr_number: event.target.value })} />
          </Field>
          <Field label="الرقم الضريبي">
            <Input dir="ltr" value={form.vat_number} onChange={(event) => setForm({ ...form, vat_number: event.target.value })} />
          </Field>
          <Field label="المدينة">
            <Input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
          </Field>
          <Field label="الحالة" required>
            <Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as Supplier["status"] })}>
              {supplierStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </Select>
          </Field>
        </div>

        <Field label="التصنيفات">
          <div className="grid gap-2 rounded-xl border border-slate-800 bg-slate-950 p-3 sm:grid-cols-2 lg:grid-cols-3">
            {categoryOptions.map((category) => (
              <label key={category} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-200 hover:bg-slate-900">
                <input type="checkbox" checked={form.categories.includes(category)} onChange={() => toggleCategory(category)} />
                {category}
              </label>
            ))}
          </div>
        </Field>

        <Field label="ملاحظات">
          <Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
        </Field>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "جاري الحفظ..." : "حفظ"}</Button>
        </div>
      </form>
    </Modal>
  );
}
