import { 
  Users, 
  CheckCircle2, 
  Clock, 
  Ban, 
  FileX, 
  AlertTriangle, 
  FileQuestion 
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const stats = [
  { name: 'إجمالي الموردين', value: '142', icon: Users, color: 'text-brand-600', bgColor: 'bg-brand-100' },
  { name: 'موردين نشطين', value: '108', icon: CheckCircle2, color: 'text-success-600', bgColor: 'bg-success-100' },
  { name: 'موردين قيد المراجعة', value: '24', icon: Clock, color: 'text-warning-600', bgColor: 'bg-warning-100' },
  { name: 'موردين موقوفين', value: '10', icon: Ban, color: 'text-danger-600', bgColor: 'bg-danger-100' },
  { name: 'مستندات منتهية', value: '15', icon: FileX, color: 'text-danger-600', bgColor: 'bg-danger-100' },
  { name: 'مستندات تقترب من الانتهاء', value: '32', icon: AlertTriangle, color: 'text-warning-600', bgColor: 'bg-warning-100' },
  { name: 'موردين ببيانات ناقصة', value: '18', icon: FileQuestion, color: 'text-brand-600', bgColor: 'bg-brand-100' },
];

export function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {stats.map((item) => (
          <div
            key={item.name}
            className="relative overflow-hidden rounded-2xl bg-white px-6 py-5 shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow"
          >
            <div className={cn("p-4 rounded-xl", item.bgColor, item.color)}>
              <item.icon className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="truncate text-sm font-medium text-slate-500">{item.name}</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Recent Activity Mock Placeholder */}
        <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">أحدث النشاطات</h2>
          <div className="space-y-4">
            {[
              { id: 1, text: "تم تحديث السجل التجاري لـ 'شركة الأدوية الحديثة'", time: "قبل 10 دقائق", status: "success" },
              { id: 2, text: "تم إضافة مورد جديد 'ميديكال سبلايز'", time: "قبل ساعة", status: "info" },
              { id: 3, text: "انتهاء صلاحية شهادة الزكاة والدخل لـ 'عيادات النور'", time: "قبل ساعتين", status: "danger" },
            ].map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 pb-4 border-b border-slate-50 last:border-0 last:pb-0">
                <div className={cn(
                  "mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0",
                  activity.status === 'success' ? 'bg-success-500' : 
                  activity.status === 'danger' ? 'bg-danger-500' : 'bg-primary-500'
                )} />
                <div>
                  <p className="text-sm font-medium text-slate-800">{activity.text}</p>
                  <p className="text-xs text-slate-500 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Items Mock Placeholder */}
        <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">إجراءات مطلوبة</h2>
          <div className="space-y-4">
             {[
              { id: 1, supplier: "شركة المعدات المتطورة", action: "مراجعة عقد جديد", type: "warning" },
              { id: 2, supplier: "مستودع أدوية الشفاء", action: "تحديث الرخصة الطبية", type: "danger" },
              { id: 3, supplier: "المستلزمات التقنية", action: "إكمال البيانات الأساسية", type: "info" },
            ].map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                <div>
                  <p className="text-sm font-bold text-slate-800">{item.supplier}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{item.action}</p>
                </div>
                <button className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-primary-600 transition-colors shadow-sm">
                  مراجعة
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
