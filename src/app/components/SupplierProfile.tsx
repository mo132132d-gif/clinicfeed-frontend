import { useState } from "react";
import { useParams, Link } from "react-router";
import { 
  Building2, 
  MapPin, 
  Tag, 
  FileText, 
  Hash, 
  ChevronRight,
  Upload,
  ExternalLink,
  Copy,
  AlertCircle,
  CheckCircle2,
  Clock
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const tabs = [
  { id: "basic", name: "المعلومات الأساسية" },
  { id: "contacts", name: "جهات الاتصال" },
  { id: "documents", name: "العقود والمستندات" },
  { id: "alerts", name: "التنبيهات" },
  { id: "activity", name: "سجل النشاط" },
  { id: "notes", name: "الملاحظات" },
];

const mockDocuments = [
  { id: 1, type: "عقد توريد", name: "عقد توريد أدوية 2025", issueDate: "2025-01-01", expiryDate: "2026-01-01", status: "ساري", size: "2.4 MB" },
  { id: 2, type: "سجل تجاري", name: "شهادة السجل التجاري", issueDate: "2023-05-15", expiryDate: "2024-05-15", status: "منتهي", size: "1.1 MB" },
  { id: 3, type: "شهادة زكاة", name: "شهادة الزكاة والدخل", issueDate: "2024-11-01", expiryDate: "2025-04-30", status: "قارب على الانتهاء", size: "850 KB" },
];

export function SupplierProfile() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("documents");

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
        <Link to="/suppliers" className="hover:text-primary-600 transition-colors">الموردين</Link>
        <ChevronRight className="h-4 w-4 rtl:rotate-180" />
        <span className="text-slate-900">شركة الأدوية الحديثة</span>
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex items-start gap-5">
            <div className="h-16 w-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-primary-600 flex-shrink-0">
              <Building2 className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-slate-900">شركة الأدوية الحديثة</h2>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-success-100 text-success-700">
                  نشط
                </span>
              </div>
              
              <div className="flex flex-wrap gap-x-6 gap-y-3 mt-4 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <span>الرياض, المملكة العربية السعودية</span>
                </div>
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-slate-400" />
                  <span>أدوية ومستلزمات طبية</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-400" />
                  <span className="flex items-center gap-1">س.ت: <span className="font-mono text-slate-900">1010123456</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-slate-400" />
                  <span className="flex items-center gap-1">الرقم الضريبي: <span className="font-mono text-slate-900">300123456700003</span></span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
              تعديل البيانات
            </button>
            <button className="px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors shadow-sm shadow-primary-500/20">
              إجراء جديد
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="border-b border-slate-200">
          <nav className="flex overflow-x-auto px-2" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "whitespace-nowrap py-4 px-4 border-b-2 font-medium text-sm transition-colors",
                  activeTab === tab.id
                    ? "border-primary-600 text-primary-600"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                )}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Active Tab Content: Documents & Contracts */}
          {activeTab === "documents" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">العقود والمستندات الرسمية</h3>
                <button className="flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-xl text-sm font-semibold transition-colors border border-primary-100">
                  <Upload className="h-4 w-4" />
                  رفع ملف جديد
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="min-w-full divide-y divide-slate-200 text-start text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-medium">
                    <tr>
                      <th scope="col" className="px-6 py-4 text-start whitespace-nowrap">اسم المستند</th>
                      <th scope="col" className="px-6 py-4 text-start whitespace-nowrap">النوع</th>
                      <th scope="col" className="px-6 py-4 text-start whitespace-nowrap">تاريخ الإصدار</th>
                      <th scope="col" className="px-6 py-4 text-start whitespace-nowrap">تاريخ الانتهاء</th>
                      <th scope="col" className="px-6 py-4 text-start whitespace-nowrap">حالة الصلاحية</th>
                      <th scope="col" className="px-6 py-4 text-start whitespace-nowrap">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {mockDocuments.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="whitespace-nowrap px-6 py-4 font-semibold text-slate-900 flex items-center gap-3">
                          <div className={cn(
                            "p-2 rounded-lg",
                            doc.status === "ساري" ? "bg-success-50 text-success-600" :
                            doc.status === "قارب على الانتهاء" ? "bg-warning-50 text-warning-600" :
                            "bg-danger-50 text-danger-600"
                          )}>
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <p>{doc.name}</p>
                            <p className="text-xs text-slate-500 font-normal">{doc.size}</p>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                          {doc.type}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-slate-600 font-mono">
                          {doc.issueDate}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-slate-600 font-mono">
                          {doc.expiryDate}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            {doc.status === "ساري" && <CheckCircle2 className="h-4 w-4 text-success-500" />}
                            {doc.status === "قارب على الانتهاء" && <Clock className="h-4 w-4 text-warning-500" />}
                            {doc.status === "منتهي" && <AlertCircle className="h-4 w-4 text-danger-500" />}
                            <span className={cn(
                              "text-xs font-bold",
                              doc.status === "ساري" ? "text-success-700" :
                              doc.status === "قارب على الانتهاء" ? "text-warning-700" :
                              "text-danger-700"
                            )}>
                              {doc.status}
                            </span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-end">
                          <div className="flex items-center gap-2 justify-start">
                            <button 
                              className="p-1.5 rounded-lg text-slate-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                              title="فتح الملف"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </button>
                            <button 
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                              title="نسخ الرابط"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Placeholders for other tabs */}
          {activeTab !== "documents" && (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <FileText className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg">محتوى {tabs.find(t => t.id === activeTab)?.name} سيظهر هنا</p>
              <p className="text-sm">قيد التطوير...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
