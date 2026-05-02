import { useQuery } from "@tanstack/react-query";
import { Activity } from "lucide-react";
import { formatDateTime } from "../../lib/format";
import { listActivity } from "../../services/activityService";
import { Card, EmptyState, LoadingState } from "../../components/shared/Primitives";

export function ActivityPage() {
  const activityQuery = useQuery({ queryKey: ["activity", "full"], queryFn: () => listActivity(50), staleTime: 30_000 });

  return (
    <Card className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-2xl bg-blue-900/70 p-3 text-blue-200">
          <Activity className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white">سجل النشاط</h2>
          <p className="text-sm text-slate-500">آخر العمليات المسجلة من قاعدة البيانات.</p>
        </div>
      </div>

      {activityQuery.isLoading ? (
        <LoadingState />
      ) : (activityQuery.data || []).length === 0 ? (
        <EmptyState title="لا توجد سجلات نشاط متاحة حاليًا" />
      ) : (
        <div className="space-y-5">
          {(activityQuery.data || []).map((item) => (
            <div key={item.id} className="relative border-r-2 border-blue-800 pr-5">
              <span className="absolute -right-[7px] top-1 h-3 w-3 rounded-full bg-blue-500" />
              <p className="font-black text-white">{item.action}</p>
              <p className="mt-1 text-sm text-slate-400">
                المستخدم: {item.user_id || "-"} · الكيان المتأثر: {item.entity_type} · التاريخ والوقت: {formatDateTime(item.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
