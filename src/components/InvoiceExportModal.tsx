import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Loader2 } from 'lucide-react';
import { generateInvoicePdf } from '@/lib/invoicePdfGenerator';
import { useToast } from '@/hooks/use-toast';

interface InvoiceLine {
  label: string;
  detail: string;
  result: number;
}

interface InvoiceExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lines: InvoiceLine[];
  total: number;
}

export default function InvoiceExportModal({ open, onOpenChange, lines, total }: InvoiceExportModalProps) {
  const [orderNum, setOrderNum] = useState('');
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const currentYear = new Date().getFullYear();
  const fullOrderNumber = orderNum ? `${currentYear}-${orderNum.padStart(4, '0')}` : '';

  const handleExport = async () => {
    if (!orderNum.trim()) {
      toast({ title: 'يرجى إدخال رقم الطلب', variant: 'destructive' });
      return;
    }
    if (total <= 0) {
      toast({ title: 'لا توجد بنود للتصدير', variant: 'destructive' });
      return;
    }

    setGenerating(true);
    try {
      await generateInvoicePdf({
        orderNumber: fullOrderNumber,
        lines: lines.map(l => ({ label: l.label, detail: l.detail, amount: l.result })),
        total,
      });
      toast({ title: 'تم تصدير الفاتورة بنجاح ✓' });
      onOpenChange(false);
    } catch (e) {
      toast({ title: 'حدث خطأ أثناء التصدير', variant: 'destructive' });
    }
    setGenerating(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            تصدير فاتورة إلكترونية
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium">رقم الطلب (بدون السنة)</Label>
            <Input
              value={orderNum}
              onChange={e => setOrderNum(e.target.value.replace(/\D/g, ''))}
              placeholder="مثال: 5001"
              dir="ltr"
              className="text-center text-lg font-bold"
              maxLength={6}
            />
            {orderNum && (
              <p className="text-xs text-muted-foreground text-center">
                سيظهر في الفاتورة: <span className="font-bold text-foreground">{fullOrderNumber}</span>
              </p>
            )}
          </div>

          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <p className="text-xs text-muted-foreground">عدد البنود: <span className="font-semibold text-foreground">{lines.length}</span></p>
            <p className="text-xs text-muted-foreground">الإجمالي شامل الضريبة: <span className="font-semibold text-foreground">{total.toLocaleString('en-US')} ريال</span></p>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button onClick={handleExport} disabled={generating || !orderNum.trim()} className="w-full gap-2">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            {generating ? 'جارٍ التصدير...' : 'تصدير الفاتورة PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
