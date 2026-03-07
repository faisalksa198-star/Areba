import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Package, School, Users, MapPin } from 'lucide-react';

const statusMap: Record<string, { label: string; color: string }> = {
  pending_data: { label: 'بانتظار البيانات', color: 'bg-warning/10 text-warning border-warning/20' },
  in_progress: { label: 'قيد التنفيذ', color: 'bg-info/10 text-info border-info/20' },
  completed: { label: 'مكتمل', color: 'bg-success/10 text-success border-success/20' },
  cancelled: { label: 'ملغي', color: 'bg-destructive/10 text-destructive border-destructive/20' },
};

export default function OrderStatus() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    supabase
      .from('orders')
      .select('order_number, school_name, leader_name, student_count, status, created_at, cities(name)')
      .eq('id', orderId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) setNotFound(true);
        else setOrder(data);
        setLoading(false);
      });
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <p className="text-muted-foreground">الطلب غير موجود</p>
      </div>
    );
  }

  const status = statusMap[order.status] || statusMap.pending_data;

  return (
    <div className="min-h-screen bg-background p-4" dir="rtl">
      <div className="max-w-md mx-auto space-y-4 pt-8">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-foreground">متابعة الطلب</h1>
          <p className="text-sm text-muted-foreground mt-1">{order.order_number}</p>
        </div>

        <Card className="border-border/50">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">الحالة</span>
              <Badge variant="outline" className={status.color}>{status.label}</Badge>
            </div>
            {order.school_name && (
              <div className="flex items-center gap-2">
                <School className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-foreground">{order.school_name}</span>
              </div>
            )}
            {order.leader_name && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-foreground">{order.leader_name}</span>
              </div>
            )}
            {order.student_count && (
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-foreground">{order.student_count} طالبة</span>
              </div>
            )}
            {order.cities?.name && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-foreground">{order.cities.name}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
