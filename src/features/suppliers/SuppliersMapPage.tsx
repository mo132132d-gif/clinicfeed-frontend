import { Link } from "react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import { MapPinned, RefreshCw } from "lucide-react";
import { listSuppliers } from "../../services/supplierService";
import type { Supplier } from "../../types";
import { Button, Card, EmptyState, LoadingState, Select, StatusBadge } from "../../components/shared/Primitives";
import { categoryOptions } from "../../lib/constants";
import { parseCategories } from "../../lib/format";

const RIYADH_CENTER: [number, number] = [24.7136, 46.6753];

function supplierName(supplier: Supplier) {
  return supplier.name_ar || supplier.name_en || "مورد بدون اسم";
}

function toCoordinate(value: Supplier["latitude"] | Supplier["longitude"]) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function supplierPosition(supplier: Supplier): [number, number] | null {
  const latitude = toCoordinate(supplier.latitude);
  const longitude = toCoordinate(supplier.longitude);

  if (latitude === null || longitude === null) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;

  return [latitude, longitude];
}

function cityText(supplier: Supplier) {
  return [supplier.city, supplier.country].filter(Boolean).join(" / ") || "-";
}

export function SuppliersMapPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const suppliersQuery = useQuery({ queryKey: ["suppliers"], queryFn: listSuppliers, staleTime: 60_000 });
  const suppliers = suppliersQuery.data || [];

  const mappedSuppliers = useMemo(() => (
    suppliers
      .map((supplier) => ({
        supplier,
        position: supplierPosition(supplier),
        categories: parseCategories(supplier.categories ?? supplier.category),
      }))
      .filter((item): item is { supplier: Supplier; position: [number, number]; categories: string[] } => Boolean(item.position))
      .filter((item) => selectedCategory === "all" || item.categories.includes(selectedCategory))
  ), [suppliers, selectedCategory]);

  const center = useMemo<[number, number]>(() => {
    if (mappedSuppliers.length === 0) return RIYADH_CENTER;
    const totals = mappedSuppliers.reduce(
      (acc, item) => {
        acc.latitude += item.position[0];
        acc.longitude += item.position[1];
        return acc;
      },
      { latitude: 0, longitude: 0 },
    );

    return [totals.latitude / mappedSuppliers.length, totals.longitude / mappedSuppliers.length];
  }, [mappedSuppliers]);

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#5B73E8]/15 text-[#9FB2FF]">
                <MapPinned className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-black text-white">خريطة الموردين</h2>
                <p className="mt-1 text-sm text-[#8E9AB6]">
                  عرض الموردين الذين لديهم خط عرض وخط طول محفوظين في النظام.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-xl border border-[#373E55] bg-[#242A39] px-4 py-2 text-sm font-bold text-[#C3CBE0]">
              مواقع محددة: {mappedSuppliers.length}
            </div>
            <Select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              className="rounded-xl border border-[#373E55] bg-[#242A39] px-4 py-2 text-sm font-bold text-[#C3CBE0]"
            >
              <option value="all">الكل</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
            <Button variant="secondary" onClick={() => suppliersQuery.refetch()} disabled={suppliersQuery.isFetching}>
              <RefreshCw className={`h-4 w-4 ${suppliersQuery.isFetching ? "animate-spin" : ""}`} />
              {suppliersQuery.isFetching ? "جاري التحديث..." : "تحديث"}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {suppliersQuery.isLoading ? (
          <LoadingState label="جاري تحميل مواقع الموردين..." />
        ) : suppliersQuery.error ? (
          <EmptyState title="فشل تحميل خريطة الموردين" subtitle="تحقق من اتصال الخادم ثم حاول مرة أخرى." />
        ) : mappedSuppliers.length === 0 ? (
          <EmptyState title="لا يوجد موردون لديهم مواقع محددة على الخريطة حالياً" />
        ) : (
          <div className="clinicfeed-map h-[72vh] min-h-[420px] w-full overflow-hidden rounded-2xl border border-[#30364A]">
            <MapContainer
              center={center}
              zoom={mappedSuppliers.length === 1 ? 12 : 6}
              scrollWheelZoom
              className="h-full w-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {mappedSuppliers.map(({ supplier, position, categories }) => (
                <CircleMarker
                  key={supplier.id}
                  center={position}
                  radius={9}
                  pathOptions={{
                    color: "#C8D2FF",
                    fillColor: "#5B73E8",
                    fillOpacity: 0.88,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div dir="rtl" className="space-y-3 p-3 text-right">
                      <div>
                        <p className="font-black text-white">{supplierName(supplier)}</p>
                        <p className="mt-1 text-xs text-[#9FB2D9]">{cityText(supplier)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {categories.map((category) => (
                          <span
                            key={category}
                            className="rounded-full bg-[#2F3650] px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-[#C3CBE0]"
                          >
                            {category}
                          </span>
                        ))}
                      </div>
                      <StatusBadge status={supplier.status} />
                      <Link
                        to={`/suppliers/${supplier.id}`}
                        className="inline-flex w-full items-center justify-center rounded-lg bg-[#5B73E8] px-3 py-2 text-xs font-black text-white transition hover:bg-[#4F63D2]"
                      >
                        فتح ملف المورد
                      </Link>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        )}
      </Card>
    </div>
  );
}
