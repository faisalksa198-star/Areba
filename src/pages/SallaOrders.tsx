import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingBag } from 'lucide-react';

export default function SallaOrders() {
  return (
    <DashboardLayout>
      <div className="space-y-5" dir="rtl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">طلبات موقع سلة</h1>
          <p className="text-muted-foreground text-sm mt-1">إدارة الطلبات الواردة من موقع سلة</p>
        </div>
        <Card>
          <CardContent className="py-16 text-center">
            <ShoppingBag className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">سيتم تفعيل هذا القسم قريباً</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
