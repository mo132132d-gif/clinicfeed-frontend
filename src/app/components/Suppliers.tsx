import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  Search,
  Plus,
  Filter,
  Eye,
  Edit2,
  Archive,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Supplier = {
  id: string | number;
  name?: string;
  supplier_name?: string;
  company_name?: string;
  status?: string;
  category?: string;
  classification?: string;
  cr?: string;
  cr_number?: string;
  commercial_registration?: string;
  city?: string;
};

const API_BASE_URL = "http://localhost:4000";

function getToken() {
  return localStorage.getItem("token") || localStorage.getItem("authToken") || "";
}

function normalizeSupplier(supplier: Supplier) {
  return {
    id: supplier.id,
    name: supplier.name || supplier.supplier_name || supplier.company_name || "بدون اسم",
    status: supplier.status || "قيد المراجعة",
    category: supplier.category || supplier.classification || "غير مصنف",
    cr: supplier.cr || supplier.cr_number || supplier.commercial_registration || "-",
    city: supplier.city || "-"
  };
}

export function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("الكل");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchSuppliers() {
    try {
      setLoading(true);
      setError("");

      const token = getToken();

      const response = await fetch(`${API_BASE_URL}/api/suppliers`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (!response.ok) {
        throw new Error(`فشل تحميل الموردين - Status ${response.status}`);
      }

      const data = await response.json();

      const rows = Array.isArray(data)
        ? data
        : Array.isArray(data.suppliers)
          ? data.suppliers
          : Array.isArray(data.data)
            ? data.data
            : [];

      setSuppliers(rows);
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء تحميل الموردين");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const filteredSuppliers = useMemo(() => {
    return suppliers
      .map(normalizeSupplier)
      .filter((supplier) => {
        const matchesSearch =
          supplier.name.includes(searchTerm) ||
          supplier.cr.includes(searchTerm) ||
          supplier.city.includes(searchTerm) ||
          supplier.category.includes(searchTerm);

        const matchesStatus =
          statusFilter === "الكل" || supplier.status === statusFilter;

        return matchesSearch && matchesStatus;
      });
  }, [suppliers, searchTerm, statusFilter]);

  async function addSupplier() {
    const name = window.prompt("اكتب اسم المورد:");
    if (!name) return;

    const city = window.prompt("اكتب المدينة:", "الرياض") || "";
    const category = window.prompt("اكتب التصنيف:", "أجهزة طبية") || "";
    const cr = window.prompt("اكتب رقم السجل التجاري:", "") || "";

    try {
      const token = getToken();

      const response = await fetch(`${API_BASE_URL}/api/suppliers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          name,
          supplier_name: name,
          city,
          category,
          cr,
          cr_number: cr,
          status: "قيد المراجعة"
        })
      });

      if (!response.ok) {
        throw new Error(`فشلت إضافة المورد - Status ${response.status}`);
      }

      await fetchSuppliers();
    } catch (err: any) {
      alert(err.message || "فشلت إضافة المورد");
    }
  }

  async function editSupplier(supplier: ReturnType<typeof normalizeSupplier>) {
    const name = window.prompt("تعديل اسم المورد:", supplier.name);
    if (!name) return;

    const city = window.prompt("تعديل المدينة:", supplier.city) || supplier.city;
    const category = window.prompt("تعديل التصنيف:", supplier.category) || supplier.category;
    const cr = window.prompt("تعديل رقم السجل التجاري:", supplier.cr) || supplier.cr;
    const status = window.prompt("تعديل الحالة: نشط / قيد المراجعة / موقوف", supplier.status) || supplier.status;

    try {
      const token = getToken();

      const response = await fetch(`${API_BASE_URL}/api/suppliers/${supplier.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          name,
          supplier_name: name,
          city,
          category,
          cr,
          cr_number: cr,
          status
        })
      });

      if (!response.ok) {
        throw new Error(`فشل تعديل المورد - Status ${response.status}`);
      }

      await fetchSuppliers();
    } catch (err: any) {
      alert(err.message || "فشل تعديل المورد");
    }
  }

  async function archiveSupplier(supplier: ReturnType<typeof normalizeSupplier>) {
    const confirmed = window.confirm(`هل تريد أرشفة المورد: ${supplier.name}؟`);
    if (!confirmed) return;

    try {
      const token = getToken();

      let response = await fetch(`${API_BASE_URL}/api/suppliers/${supplier.id}/archive`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (!response.ok) {
        response = await fetch(`${API_BASE_URL}/api/suppliers/${supplier.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ status: "موقوف" })
        });
      }

      if (!response.ok) {
        throw new Error(`فشلت أرشفة المورد - Status ${response.status}`);
      }

      await fetchSuppliers();
    } catch (err: any) {
      alert(err.message || "فشلت أرشفة المورد");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="ابحث برقم السجل، أو الاسم..."
              className="block w-full rounded-xl border-0 py-2.5 ps-10 pe-4 text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6 bg-slate-50/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="hidden sm:block rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="الكل">كل الحالات</option>
            <option value="نشط">نشط</option>
            <option value="قيد المراجعة">قيد المراجعة</option>
            <option value="موقوف">موقوف</option>
          </select>

          <button
            onClick={fetchSuppliers}
            className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-medium text-sm transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            تحديث
          </button>
        </div>

        <button
          onClick={addSupplier}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium text-sm transition-colors shadow-sm shadow-primary-500/20"
        >
          <Plus className="h-5 w-5" />
          إضافة مورد
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-start text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th scope="col" className="px-6 py-4 text-start font-medium whitespace-nowrap">اسم المورد</th>
                <th scope="col" className="px-6 py-4 text-start font-medium whitespace-nowrap">الحالة</th>
                <th scope="col" className="px-6 py-4 text-start font-medium whitespace-nowrap">التصنيف</th>
                <th scope="col" className="px-6 py-4 text-start font-medium whitespace-nowrap">السجل التجاري</th>
                <th scope="col" className="px-6 py-4 text-start font-medium whitespace-nowrap">المدينة</th>
                <th scope="col" className="px-6 py-4 text-start font-medium whitespace-nowrap w-24">الإجراءات</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                    جاري تحميل الموردين...
                  </td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                    لا توجد بيانات موردين
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="whitespace-nowrap px-6 py-4 font-semibold text-slate-900">
                      {supplier.name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold",
                        supplier.status === "نشط" ? "bg-success-100 text-success-700" :
                        supplier.status === "قيد المراجعة" ? "bg-warning-100 text-warning-700" :
                        "bg-danger-100 text-danger-700"
                      )}>
                        {supplier.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700">
                        {supplier.category}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-600 font-mono text-sm">
                      {supplier.cr}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                      {supplier.city}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-end">
                      <div className="flex items-center gap-2 justify-start">
                        <Link
                          to={`/suppliers/${supplier.id}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                          title="عرض الملف"
                        >
                          <Eye className="h-5 w-5" />
                        </Link>
                        <button
                          onClick={() => editSupplier(supplier)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="تعديل"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => archiveSupplier(supplier)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
                          title="أرشفة"
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <p className="text-sm text-slate-700">
              عرض <span className="font-semibold">{filteredSuppliers.length}</span> من أصل{" "}
              <span className="font-semibold">{suppliers.length}</span> نتيجة
            </p>

            <nav className="isolate inline-flex -space-x-px rounded-xl shadow-sm bg-white" aria-label="Pagination">
              <button className="relative inline-flex items-center rounded-r-xl px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 border-l border-slate-200">
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
              <button aria-current="page" className="relative z-10 inline-flex items-center bg-primary-600 px-4 py-2 text-sm font-semibold text-white">1</button>
              <button className="relative inline-flex items-center rounded-l-xl px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 border-r border-slate-200">
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
