import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import PublicCalculator from '@/components/PublicCalculator';

export default function Calculator() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const publicUrl = `${window.location.origin}/public-calculator`;

  const handleCopy = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast({ title: 'تم نسخ الرابط ✓' });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">حاسبة الأسعار</h1>
            <p className="text-muted-foreground text-sm mt-1">احسب التكلفة الإجمالية للطلب</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'تم النسخ' : 'نسخ رابط الحاسبة'}
          </Button>
        </div>
        <PublicCalculator />
      </div>
    </DashboardLayout>
  );
}
