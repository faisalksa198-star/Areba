import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { FileText, Trash2, Search, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { generateInvoicePdf } from '@/lib/invoicePdfGenerator';
import PublicCalculator, { CalcSummaryLine } from '@/components/PublicCalculator';

interface OrderRow {
  id: string;
  order_number: string;
  employee_id: string;
  status: string;
  employee_name?: string;
  has_invoice: boolean;
  invoice_id?: string;
}

export default function Invoices() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [myOrdersOnly, setMyOrdersOnly] = useState(false);
  const [uninvoicedOnly, setUninvoicedOnly] = useState(false);

  // Invoice creation modal
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);
  const [calcOpen, setCalcOpen] = useState(false);
  const [summaryLines, setSummaryLines] = useState<CalcSummaryLine[]>([]);
  const [summaryTotal, setSummaryTotal] = useState(0);
  const [discountSar, setDiscountSar] = useState('');
  const [discountPct, setDiscountPct] = useState('');
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    const { data: ordersData } = await supabase
      .from('orders')
      .select('id, order_number, employee_id, status')
      .order('created_at', { ascending: false });

    const { data: invoicesData } = await supabase
      .from('invoices' as any)
      .select('id, order_id');

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name');

    const profileMap: Record<string, string> = {};
    (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p.full_name; });

    const invoiceMap: Record<string, string> = {};
    ((invoicesData as any[]) || []).forEach((inv: any) => { invoiceMap[inv.order_id] = inv.id; });

    const rows: OrderRow[] = (ordersData || []).map((o: any) => ({
      id: o.id,
      order_number: o.order_number,
      employee_id: o.employee_id,
      status: o.status,
      employee_name: profileMap[o.employee_id] || 'غير معروف',
      has_invoice: !!invoiceMap[o.id],
      invoice_id: invoiceMap[o.id],
    }));

    setOrders(rows);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const filtered = orders.filter(o => {
    if (myOrdersOnly && o.employee_id !== user?.id) return false;
    if (uninvoicedOnly && o.has_invoice) return false;
    if (search && !o.order_number.includes(search)) return false;
    return true;
  });

  const handleIssueInvoice = (order: OrderRow) => {
    setSelectedOrder(order);
    setSummaryLines([]);
    setSummaryTotal(0);
    setDiscountSar('');
    setDiscountPct('');
    setCalcOpen(true);
  };

  const computeDiscount = () => {
    const subtotal = summaryTotal;
    const fixedDisc = parseFloat(discountSar) || 0;
    const pctDisc = parseFloat(discountPct) || 0;
    const pctAmount = subtotal * (pctDisc / 100);
    const totalDiscount = Math.min(fixedDisc + pctAmount, subtotal);
    const afterDiscount = subtotal - totalDiscount;
    const preTax = afterDiscount / 1.15;
    const tax = afterDiscount - preTax;
    return { subtotal, totalDiscount, afterDiscount, preTax, tax };
  };

  const handleGenerateInvoice = async () => {
    if (!selectedOrder) return;
    const { subtotal, totalDiscount, afterDiscount, preTax, tax } = computeDiscount();

    if (afterDiscount <= 0) {
      toast({ title: 'الخصم أكبر من الإجمالي', variant: 'destructive' });
      return;
    }

    setGenerating(true);
    try {
      await generateInvoicePdf({
        orderNumber: selectedOrder.order_number,
        lines: summaryLines.map(l => ({ label: l.label, detail: l.detail, amount: l.result })),
        total: afterDiscount,
        discount: totalDiscount > 0 ? totalDiscount : undefined,
        subtotalBeforeDiscount: totalDiscount > 0 ? subtotal : undefined,
      });

      // Save invoice to DB
      await supabase.from('invoices' as any).insert({
        order_id: selectedOrder.id,
        invoice_number: selectedOrder.order_number,
        discount_amount: parseFloat(discountSar) || 0,
        discount_percent: parseFloat(discountPct) || 0,
        subtotal,
        total_after_discount: afterDiscount,
        tax_amount: tax,
        total_with_tax: afterDiscount,
        line_items: summaryLines,
        created_by: user?.id,
      } as any);

      toast({ title: 'تم إصدار الفاتورة بنجاح ✓' });
      setCalcOpen(false);
      fetchOrders();
    } catch {
      toast({ title: 'حدث خطأ أثناء إصدار الفاتورة', variant: 'destructive' });
    }
    setGenerating(false);
  };

  const handleDeleteInvoice = async (order: OrderRow) => {
    if (!order.invoice_id) return;
    setDeleting(order.invoice_id);
    await supabase.from('invoices' as any).delete().eq('id', order.invoice_id);
    toast({ title: 'تم حذف الفاتورة' });
    setDeleting(null);
    fetchOrders();
  };

  return (
    <DashboardLayout>
      <div className="space-y-5" dir="rtl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">الفواتير الإلكترونية</h1>
          <p className="text-muted-foreground text-sm mt-1">إدارة وإصدار الفواتير للطلبات</p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث برقم الطلب..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pr-9"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch id="my-orders" checked={myOrdersOnly} onCheckedChange={setMyOrdersOnly} />
                <Label htmlFor="my-orders" className="text-sm">طلباتي فقط</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="uninvoiced" checked={uninvoicedOnly} onCheckedChange={setUninvoicedOnly} />
                <Label htmlFor="uninvoiced" className="text-sm">غير المفوترة</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">لا توجد طلبات</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">رقم الطلب</TableHead>
                    <TableHead className="text-right">الموظف</TableHead>
                    <TableHead className="text-center">حالة الفاتورة</TableHead>
                    <TableHead className="text-center">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(order => (
                    <TableRow key={order.id}>
                      <TableCell className="font-semibold">{order.order_number}</TableCell>
                      <TableCell>{order.employee_name}</TableCell>
                      <TableCell className="text-center">
                        {order.has_invoice ? (
                          <Badge variant="default" className="gap-1 bg-emerald-500/15 text-emerald-700 border-emerald-200 hover:bg-emerald-500/15">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            مفوترة
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-muted-foreground">
                            <XCircle className="h-3.5 w-3.5" />
                            غير مفوترة
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-2">
                          {!order.has_invoice ? (
                            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleIssueInvoice(order)}>
                              <FileText className="h-3.5 w-3.5" />
                              إصدار فاتورة
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteInvoice(order)}
                              disabled={deleting === order.invoice_id}
                            >
                              {deleting === order.invoice_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                              حذف الفاتورة
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Issue Invoice Modal */}
      <Dialog open={calcOpen} onOpenChange={setCalcOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              إصدار فاتورة — {selectedOrder?.order_number}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <PublicCalculator onSummaryChange={(lines, total) => { setSummaryLines(lines); setSummaryTotal(total); }} />

            {summaryTotal > 0 && (
              <Card className="border-primary/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">الخصم</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">خصم بالريال</Label>
                      <Input type="number" min="0" step="0.01" placeholder="0" value={discountSar} onChange={e => setDiscountSar(e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">خصم بالنسبة %</Label>
                      <Input type="number" min="0" max="100" step="0.1" placeholder="0" value={discountPct} onChange={e => setDiscountPct(e.target.value)} />
                    </div>
                  </div>
                  {(() => {
                    const { subtotal, totalDiscount, afterDiscount, preTax, tax } = computeDiscount();
                    return totalDiscount > 0 ? (
                      <div className="text-xs space-y-1 bg-muted/50 rounded-lg p-3">
                        <div className="flex justify-between"><span>الإجمالي قبل الخصم</span><span className="font-semibold">{subtotal.toLocaleString('en-US')} ريال</span></div>
                        <div className="flex justify-between text-destructive"><span>الخصم</span><span className="font-semibold">- {totalDiscount.toLocaleString('en-US')} ريال</span></div>
                        <div className="flex justify-between font-bold border-t pt-1"><span>الصافي بعد الخصم</span><span>{afterDiscount.toLocaleString('en-US')} ريال</span></div>
                      </div>
                    ) : null;
                  })()}
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button onClick={handleGenerateInvoice} disabled={generating || summaryTotal <= 0} className="w-full gap-2">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              {generating ? 'جارٍ الإصدار...' : 'إصدار وتحميل الفاتورة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
