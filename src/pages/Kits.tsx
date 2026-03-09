import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Package } from 'lucide-react';

export default function Kits() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">الأطقم الجاهزة</h1>
          <p className="text-muted-foreground text-sm mt-1">إنشاء وإدارة أطقم العبايات</p>
        </div>
        <Card className="border-border/50">
          <CardContent className="p-6 text-center py-12">
            <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">قريباً — إدارة الأطقم الجاهزة</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
