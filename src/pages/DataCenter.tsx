import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Database } from 'lucide-react';

export default function DataCenter() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">مركز البيانات</h1>
          <p className="text-muted-foreground text-sm mt-1">إدارة التصاميم والأوشحة والأكمام والخطوط والمدن</p>
        </div>
        <Card className="border-border/50">
          <CardContent className="p-6 text-center py-12">
            <Database className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">قريباً — إدارة البيانات الأساسية</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
