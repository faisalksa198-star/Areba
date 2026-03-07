import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { ClipboardList, Clock, Loader2, CheckCircle, XCircle } from 'lucide-react';

interface OrderStats {
  total: number;
  pending_data: number;
  in_progress: number;
  completed: number;
  cancelled: number;
}

const statusCards = [
  { key: 'total' as const, label: 'إجمالي الطلبات', icon: ClipboardList, color: 'bg-primary/10 text-primary' },
  { key: 'pending_data' as const, label: 'بانتظار البيانات', icon: Clock, color: 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]' },
  { key: 'in_progress' as const, label: 'قيد التنفيذ', icon: Loader2, color: 'bg-[hsl(var(--info))]/10 text-[hsl(var(--info))]' },
  { key: 'completed' as const, label: 'مكتملة', icon: CheckCircle, color: 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]' },
  { key: 'cancelled' as const, label: 'ملغاة', icon: XCircle, color: 'bg-destructive/10 text-destructive' },
];

export default function Dashboard() {
  const [stats, setStats] = useState<OrderStats>({ total: 0, pending_data: 0, in_progress: 0, completed: 0, cancelled: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const { data, error } = await supabase.from('orders').select('status');
      if (!error && data) {
        const s: OrderStats = { total: data.length, pending_data: 0, in_progress: 0, completed: 0, cancelled: 0 };
        data.forEach((o) => {
          if (o.status in s) s[o.status as keyof Omit<OrderStats, 'total'>]++;
        });
        setStats(s);
      }
      setLoading(false);
    }
    fetchStats();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">لوحة التحكم</h1>
          <p className="text-muted-foreground text-sm mt-1">نظرة عامة على الطلبات والإحصائيات</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
          {statusCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.key} className="border-border/50 hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${card.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {loading ? '—' : stats[card.key]}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recent orders placeholder */}
        <Card className="border-border/50">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">آخر الطلبات</h2>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : stats.total === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">لا توجد طلبات بعد</p>
                <p className="text-xs mt-1">ابدأ بإنشاء طلب جديد من قسم الطلبات</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">سيتم عرض آخر الطلبات هنا</p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
