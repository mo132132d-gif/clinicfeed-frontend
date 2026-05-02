import { AlertTriangle, Clock, Info, ShieldAlert } from "lucide-react";
import { useLocation } from "react-router";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Alerts() {
  const location = useLocation();
  const isMissingData = location.pathname.includes("missing-data");

  const alerts = [
    {
      id: 1,
      supplier: "مستودع الشفاء للأدوية",
      title: "انتهاء رخصة مزاولة المهنة",
      desc: "تنتهي رخصة مزاولة المهنة خلال 5 أيام. يرجى التواصل مع المورد لتحديث المستند.",
      type: "danger",
      date: "اليوم",
      icon: ShieldAlert
    },
    {
      id: 2,
      supplier: "شركة المعدات الطبية المتطورة",
      title: "تحديث السجل التجاري مطلوب",
      desc: "تم رفع سجل تجاري جديد يحتاج إلى مراجعة واعتماد من قبل الإدارة.",
      type: "warning",
      date: "منذ يومين",
      icon: Clock
    },
    {
      id: 3,
      supplier: "موردين التقنية الطبية",
      title: "تغيير في بيانات التواصل",
      desc: "قام المورد بتحديث أرقام التواصل الأساسية.",
      type: "info",
      date: "منذ أسبوع",
      icon: Info
    }
  ];

  const missingData = [
    {
      id: 1,
      supplier: "شركة النظافة والتعقيم",
      missing: ["شهادة الزكاة والدخل", "الرقم الضريبي المحدث"],
      severity: "high",
      lastContacted: "2025-05-15"
    },
    {
      id: 2,
      supplier: "عيادات النور الخاصة",
      missing: ["عقد التوريد الموقع (نسخة 2025)"],
      severity: "medium",
      lastContacted: "2025-05-18"
    }
  ];

  if (isMissingData) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-warning-100 text-warning-600 rounded-lg">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">سجل البيانات المفقودة</h2>
              <p className="text-sm text-slate-500 mt-1">الموردين الذين لديهم نواقص في المستندات أو البيانات الأساسية</p>
            </div>
          </div>

          <div className="space-y-4">
            {missingData.map((item) => (
              <div key={item.id} className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">{item.supplier}</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.missing.map((miss, idx) => (
                      <span key={idx} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-white border border-slate-200 text-slate-700">
                        {miss}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col sm:items-end gap-2">
                  <span className={cn(
                    "inline-flex items-center px-3 py-1 rounded-full text-xs font-bold",
                    item.severity === "high" ? "bg-danger-100 text-danger-700" : "bg-warning-100 text-warning-700"
                  )}>
                    أهمية {item.severity === "high" ? "قصوى" : "متوسطة"}
                  </span>
                  <span className="text-xs text-slate-500">
                    آخر تواصل: {item.lastContacted}
                  </span>
                  <button className="mt-2 text-sm font-semibold text-primary-600 hover:text-primary-700">
                    إرسال تذكير
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4">
        {alerts.map((alert) => (
          <div key={alert.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex gap-5 items-start hover:shadow-md transition-shadow">
            <div className={cn(
              "p-3 rounded-xl flex-shrink-0",
              alert.type === 'danger' ? 'bg-danger-50 text-danger-600' :
              alert.type === 'warning' ? 'bg-warning-50 text-warning-600' :
              'bg-blue-50 text-blue-600'
            )}>
              <alert.icon className="h-6 w-6" />
            </div>
            
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                <h3 className="text-lg font-bold text-slate-900">{alert.title}</h3>
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md w-fit">
                  {alert.date}
                </span>
              </div>
              <p className="text-sm font-semibold text-brand-600 mb-2">{alert.supplier}</p>
              <p className="text-sm text-slate-600 leading-relaxed">{alert.desc}</p>
              
              <div className="mt-4 flex gap-3">
                <button className={cn(
                  "px-4 py-2 rounded-xl text-sm font-semibold transition-colors",
                  alert.type === 'danger' ? 'bg-danger-600 text-white hover:bg-danger-700' :
                  alert.type === 'warning' ? 'bg-warning-500 text-white hover:bg-warning-600' :
                  'bg-blue-600 text-white hover:bg-blue-700'
                )}>
                  اتخاذ إجراء
                </button>
                <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
                  تجاهل
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
