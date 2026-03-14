import { useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Copy, Check, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import PublicCalculator, { CalcSummaryLine } from '@/components/PublicCalculator';
import InvoiceExportModal from '@/components/InvoiceExportModal';

export default function Calculator() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [summaryLines, setSummaryLines] = useState<CalcSummaryLine[]>([]);
  const [summaryTotal, setSummaryTotal] = useState(0);

  const publicUrl = `${window.location.origin}/calculator`;

  const handleCopy = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast({ title: 'تم نسخ الرابط ✓' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSummaryChange = useCallback((lines: CalcSummaryLine[], total: number) => {
    setSummaryLines(lines);
    setSummaryTotal(total);
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold text-foreground">حاسبة الأسعار</h1>
            <p className="text-muted-foreground text-sm mt-1">احسب التكلفة الإجمالية للطلب</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setInvoiceOpen(true)} disabled={summaryTotal <= 0} className="gap-2">
              <FileText className="h-4 w-4" />
              تصدير فاتورة
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'تم النسخ' : 'نسخ رابط الحاسبة'}
            </Button>
          </div>
        </div>
        <PublicCalculator onSummaryChange={handleSummaryChange} />
      </div>

      <InvoiceExportModal
        open={invoiceOpen}
        onOpenChange={setInvoiceOpen}
        lines={summaryLines}
        total={summaryTotal}
      />
    </DashboardLayout>
  );
}
