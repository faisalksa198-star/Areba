import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import PublicCalculator, { CalcSummaryLine } from '@/components/PublicCalculator';
import InvoiceExportModal from '@/components/InvoiceExportModal';

export default function PublicCalculatorPage() {
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [summaryLines, setSummaryLines] = useState<CalcSummaryLine[]>([]);
  const [summaryTotal, setSummaryTotal] = useState(0);

  const handleSummaryChange = useCallback((lines: CalcSummaryLine[], total: number) => {
    setSummaryLines(lines);
    setSummaryTotal(total);
  }, []);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <img src="/logo.svg" alt="Areba" className="h-12 w-12 mx-auto mb-3 rounded-xl" />
          <h1 className="text-2xl font-bold text-foreground">حاسبة الأسعار</h1>
          <p className="text-muted-foreground text-sm mt-1">احسب التكلفة الإجمالية لطلبك</p>
        </div>
        <PublicCalculator onSummaryChange={handleSummaryChange} />
        
        {summaryTotal > 0 && (
          <div className="mt-4 text-center">
            <Button variant="outline" size="sm" onClick={() => setInvoiceOpen(true)} className="gap-2">
              <FileText className="h-4 w-4" />
              تصدير فاتورة إلكترونية
            </Button>
          </div>
        )}
      </div>

      <InvoiceExportModal
        open={invoiceOpen}
        onOpenChange={setInvoiceOpen}
        lines={summaryLines}
        total={summaryTotal}
      />
    </div>
  );
}
