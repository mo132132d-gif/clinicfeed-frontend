import { FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { categoryOptions, supplierStatuses } from "../../lib/constants";
import { parseCategories, serializeCategories } from "../../lib/format";
import { parseLocationInput } from "../../lib/location";
import { createSupplier, updateSupplier } from "../../services/supplierService";
import type { Supplier } from "../../types";
import { Button, Field, Input, Modal, Select, Textarea } from "../../components/shared/Primitives";

export function SupplierFormModal({
  supplier,
  onClose,
  onSaved,
}: {
  supplier?: Supplier | null;
  onClose: () => void;
  onSaved?: (supplier: Supplier) => void;
}) {
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    name_ar: supplier?.name_ar || "",
    name_en: supplier?.name_en || "",
    cr_number: supplier?.cr_number || "",
    vat_number: supplier?.vat_number || "",
    country: supplier?.country || "",
    region: supplier?.region || "",
    city: supplier?.city || "",
    district: supplier?.district || "",
    address: supplier?.address || "",
    google_maps_url: supplier?.google_maps_url || "",
    latitude: supplier?.latitude === null || supplier?.latitude === undefined ? "" : String(supplier.latitude),
    longitude: supplier?.longitude === null || supplier?.longitude === undefined ? "" : String(supplier.longitude),
    categories: parseCategories(supplier?.categories ?? supplier?.category),
    status: supplier?.status || "Pending",
    notes: supplier?.notes || "",
  });

  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: (payload: Partial<Supplier>) => {
      return supplier ? updateSupplier(supplier.id, payload) : createSupplier(payload);
    },
    onSuccess: (savedSupplier) => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });

      if (supplier?.id) {
        queryClient.invalidateQueries({ queryKey: ["supplier", supplier.id] });
      }

      onSaved?.(savedSupplier);
      onClose();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "فشل حفظ المورد");
    },
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
    setError("");

    if (!form.name_ar.trim()) {
      setError("اسم المورد بالعربي مطلوب");
      return;
    }

    if (!form.status) {
      setError("الحالة مطلوبة");
      return;
    }

    let latitude = form.latitude.trim() ? Number(form.latitude) : null;
    let longitude = form.longitude.trim() ? Number(form.longitude) : null;

    if (form.google_maps_url.trim() && latitude === null && longitude === null) {
      try {
        const parsedLocation = parseLocationInput(form.google_maps_url.trim());
        if (parsedLocation) {
          latitude = parsedLocation.latitude;
          longitude = parsedLocation.longitude;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "فشل تحليل الموقع. يرجى التحقق من الإدخال");
        return;
      }
    }

    if (latitude !== null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) {
      setError("خط العرض يجب أن يكون بين -90 و 90");
      return;
    }

    if (longitude !== null && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)) {
      setError("خط الطول يجب أن يكون بين -180 و 180");
      return;
    }

    const payload: Partial<Supplier> = {
      name_ar: form.name_ar.trim(),
      name_en: form.name_en.trim() || form.name_ar.trim(),
      cr_number: form.cr_number.trim() || null,
      vat_number: form.vat_number.trim() || null,
      country: form.country.trim() || null,
      region: form.region.trim() || null,
      city: form.city.trim() || null,
      district: form.district.trim() || null,
      address: form.address.trim() || null,
      google_maps_url: form.google_maps_url.trim() || null,
      latitude: latitude !== null ? latitude : null,
      longitude: longitude !== null ? longitude : null,
      category: serializeCategories(form.categories),
      categories: form.categories,
      status: form.status,
      notes: form.notes.trim() || null,
    };

    mutation.mutate(payload);
  }

  return (
    <Modal title={supplier ? "تعديل بيانات المورد" : "إضافة مورد جديد"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm font-bold text-rose-200">
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
          <h3 className="mb-4 text-sm font-black text-white">معلومات المورد الأساسية</h3>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="اسم المورد بالعربي" required>
              <Input
                value={form.name_ar}
                onChange={(event) => setForm({ ...form, name_ar: event.target.value })}
                placeholder="مثال: شركة المثال الطبية"
              />
            </Field>

            <Field label="اسم المورد بالإنجليزي">
              <Input
                dir="ltr"
                value={form.name_en}
                onChange={(event) => setForm({ ...form, name_en: event.target.value })}
                placeholder="Example Medical Company"
              />
            </Field>

            <Field label="المدينة">
              <Input
                value={form.city}
                onChange={(event) => setForm({ ...form, city: event.target.value })}
                placeholder="مثال: الرياض"
              />
            </Field>

            <Field label="الحالة" required>
              <Select
                value={form.status}
                onChange={(event) => setForm({ ...form, status: event.target.value as Supplier["status"] })}
              >
                {supplierStatuses.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
          <h3 className="mb-4 text-sm font-black text-white">المعلومات النظامية</h3>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="رقم السجل التجاري">
              <Input
                dir="ltr"
                value={form.cr_number}
                onChange={(event) => setForm({ ...form, cr_number: event.target.value })}
                placeholder="1010xxxxxx"
              />
            </Field>

            <Field label="الرقم الضريبي">
              <Input
                dir="ltr"
                value={form.vat_number}
                onChange={(event) => setForm({ ...form, vat_number: event.target.value })}
                placeholder="300xxxxxxxxxxxx"
              />
            </Field>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
          <Field label="تصنيف المورد">
            <div className="grid gap-2 rounded-xl border border-slate-800 bg-slate-950 p-3 sm:grid-cols-2 lg:grid-cols-3">
              {categoryOptions.map((category) => (
                <label
                  key={category}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm font-bold text-slate-200 hover:bg-slate-900"
                >
                  <input
                    type="checkbox"
                    checked={form.categories.includes(category)}
                    onChange={() => toggleCategory(category)}
                  />
                  <span>{category}</span>
                </label>
              ))}
            </div>

            {form.categories.length === 0 && (
              <p className="mt-2 text-xs text-slate-500">
                لم يتم اختيار أي تصنيف.
              </p>
            )}
          </Field>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
          <Field label="ملاحظات">
            <Textarea
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              placeholder="اكتب أي ملاحظات داخلية عن المورد"
            />
          </Field>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="mb-4">
            <h3 className="text-sm font-black text-white">موقع المورد</h3>
            <p className="mt-2 text-xs leading-6 text-slate-400">
              لإظهار المورد على الخريطة، أدخل خط العرض وخط الطول. رابط Google Maps اختياري.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="الدولة">
              <Input
                value={form.country}
                onChange={(event) => setForm({ ...form, country: event.target.value })}
                placeholder="مثال: السعودية"
              />
            </Field>

            <Field label="المنطقة">
              <Input
                value={form.region}
                onChange={(event) => setForm({ ...form, region: event.target.value })}
                placeholder="مثال: الرياض"
              />
            </Field>

            <Field label="المدينة">
              <Input
                value={form.city}
                onChange={(event) => setForm({ ...form, city: event.target.value })}
                placeholder="مثال: الرياض"
              />
            </Field>

            <Field label="الحي">
              <Input
                value={form.district}
                onChange={(event) => setForm({ ...form, district: event.target.value })}
                placeholder="مثال: العليا"
              />
            </Field>

            <Field label="العنوان">
              <Input
                value={form.address}
                onChange={(event) => setForm({ ...form, address: event.target.value })}
                placeholder="الشارع أو وصف الموقع"
              />
            </Field>

            <Field label="موقع Google Maps أو إحداثيات">
              <Input
                dir="ltr"
                value={form.google_maps_url}
                onChange={(event) => setForm({ ...form, google_maps_url: event.target.value })}
                placeholder="مثال: 24.720861, 46.624972 أو https://maps.google.com/..."
              />
              <p className="mt-2 text-xs text-slate-500">
                يمكنك لصق رابط Google Maps أو إحداثيات مثل 24.720861, 46.624972 أو @24.720861,46.624972,17z
              </p>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="خط العرض Latitude">
                <Input
                  dir="ltr"
                  inputMode="decimal"
                  value={form.latitude}
                  onChange={(event) => setForm({ ...form, latitude: event.target.value })}
                  placeholder="24.7136"
                />
              </Field>

              <Field label="خط الطول Longitude">
                <Input
                  dir="ltr"
                  inputMode="decimal"
                  value={form.longitude}
                  onChange={(event) => setForm({ ...form, longitude: event.target.value })}
                  placeholder="46.6753"
                />
              </Field>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            إلغاء
          </Button>

          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "جاري الحفظ..." : "حفظ بيانات المورد"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
