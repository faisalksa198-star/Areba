import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Package, School, Users, MapPin, CheckCircle2, Clock, Truck, ClipboardCheck, FileCheck } from 'lucide-react';

const STEPS = [
  { key: 'pending_data', label: 'تم استلام البيانات', icon: ClipboardCheck },
  { key: 'in_review', label: 'قيد المراجعة', icon: FileCheck },
  { key: 'in_progress', label: 'قيد التنفيذ', icon: Package },
  { key: 'shipped', label: 'تم الشحن', icon: Truck },
  { key: 'completed', label: 'تم التسليم', icon: CheckCircle2 },
];

function getStepIndex(status: string): number {
  if (status === 'pending_data') return 0;
  if (status === 'in_progress') return 2;
  if (status === 'completed') return 4;
  if (status === 'cancelled') return -1;
  return 0;
}

export default function OrderStatus() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    supabase
      .from('orders')
      .select('order_number, school_name, leader_name, student_count, status, created_at, updated_at, cities(name)')
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

  const currentStep = getStepIndex(order.status);
  const isCancelled = order.status === 'cancelled';

  return (
    <div className="min-h-screen bg-background p-4" dir="rtl">
      <div className="max-w-md mx-auto space-y-6 pt-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-2">
            <Package className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">متابعة الطلب</h1>
          <p className="text-sm text-muted-foreground font-mono">{order.order_number}</p>
        </div>

        {/* Cancelled state */}
        {isCancelled ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 text-center">
              <p className="text-sm font-semibold text-destructive">تم إلغاء هذا الطلب</p>
            </CardContent>
          </Card>
        ) : (
          /* Progress Stepper */
          <Card className="border-border/50 overflow-hidden">
            <CardContent className="p-5">
              <div className="relative">
                {STEPS.map((step, index) => {
                  const isCompleted = index <= currentStep;
                  const isCurrent = index === currentStep;
                  const StepIcon = step.icon;
                  const isLast = index === STEPS.length - 1;

                  return (
                    <div key={step.key} className="flex items-start gap-3 relative">
                      {/* Vertical line */}
                      {!isLast && (
                        <div
                          className={`absolute right-[15px] top-[32px] w-[2px] h-[calc(100%-8px)] transition-colors ${
                            index < currentStep ? 'bg-primary' : 'bg-border'
                          }`}
                        />
                      )}

                      {/* Icon circle */}
                      <div
                        className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full shrink-0 transition-all ${
                          isCurrent
                            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-primary/10'
                            : isCompleted
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <StepIcon className="h-4 w-4" />
                      </div>

                      {/* Label */}
                      <div className={`pb-6 pt-1 ${isLast ? 'pb-0' : ''}`}>
                        <p
                          className={`text-sm font-medium transition-colors ${
                            isCurrent
                              ? 'text-primary font-bold'
                              : isCompleted
                              ? 'text-foreground'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {step.label}
                        </p>
                        {isCurrent && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            المرحلة الحالية
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order Summary */}
        <Card className="border-border/50">
          <CardContent className="p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">ملخص الطلب</p>
            {order.school_name && (
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-muted">
                  <School className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <span className="text-sm text-foreground">{order.school_name}</span>
              </div>
            )}
            {order.student_count != null && (
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-muted">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <span className="text-sm text-foreground">{order.student_count} طالبة</span>
              </div>
            )}
            {order.cities?.name && (
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-muted">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <span className="text-sm text-foreground">{order.cities.name}</span>
              </div>
            )}
            <div className="pt-2 border-t border-border/50">
              <p className="text-[11px] text-muted-foreground">
                آخر تحديث: {new Date(order.updated_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
