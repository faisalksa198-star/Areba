import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Pencil, Trash2, Loader2, DollarSign } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface PricingRule {
  id: string;
  min_quantity: number;
  max_quantity: number;
  price_per_kit: number;
}

export default function PricingRulesTab() {
  const { toast } = useToast();
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null);
  const [minQty, setMinQty] = useState('');
  const [maxQty, setMaxQty] = useState('');
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);

  const loadRules = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('pricing_rules')
      .select('*')
      .order('min_quantity', { ascending: true });
    setRules((data as unknown as PricingRule[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadRules(); }, [loadRules]);

  const openCreate = () => {
    setEditingRule(null);
    setMinQty('');
    setMaxQty('');
    setPrice('');
    setShowForm(true);
  };

  const openEdit = (rule: PricingRule) => {
    setEditingRule(rule);
    setMinQty(String(rule.min_quantity));
    setMaxQty(String(rule.max_quantity));
    setPrice(String(rule.price_per_kit));
    setShowForm(true);
  };

  const handleSave = async () => {
    const min = parseInt(minQty);
    const max = parseInt(maxQty);
    const p = parseFloat(price);
    if (isNaN(min) || isNaN(max) || isNaN(p) || min < 1 || max < min || p < 0) {
      toast({ title: 'يرجى إدخال قيم صحيحة', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const record = { min_quantity: min, max_quantity: max, price_per_kit: p };
    let error;
    if (editingRule) {
      ({ error } = await supabase.from('pricing_rules').update(record).eq('id', editingRule.id));
    } else {
      ({ error } = await supabase.from('pricing_rules').insert(record));
    }
    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: editingRule ? 'تم التعديل ✓' : 'تمت الإضافة ✓' });
      setShowForm(false);
      loadRules();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('pricing_rules').delete().eq('id', id);
    if (error) {
      toast({ title: 'خطأ في الحذف', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم الحذف ✓' });
      loadRules();
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">مركز التسعيرة</h2>
        <Button size="sm" onClick={openCreate} className="gap-1">
          <Plus className="h-3.5 w-3.5" />
          إضافة نطاق
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : rules.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <DollarSign className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">لا توجد نطاقات تسعيرة بعد</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الحد الأدنى</TableHead>
                  <TableHead className="text-right">الحد الأعلى</TableHead>
                  <TableHead className="text-right">سعر الطقم (ريال)</TableHead>
                  <TableHead className="text-right w-24">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map(rule => (
                  <TableRow key={rule.id}>
                    <TableCell>{rule.min_quantity}</TableCell>
                    <TableCell>{rule.max_quantity}</TableCell>
                    <TableCell>{rule.price_per_kit} ريال</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(rule)} className="h-7 px-2">
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(rule.id)} className="h-7 px-2 text-destructive hover:text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'تعديل نطاق التسعيرة' : 'إضافة نطاق تسعيرة'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">الحد الأدنى *</label>
                <Input type="number" min="1" value={minQty} onChange={e => setMinQty(e.target.value)} placeholder="1" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">الحد الأعلى *</label>
                <Input type="number" min="1" value={maxQty} onChange={e => setMaxQty(e.target.value)} placeholder="10" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">سعر الطقم (ريال) *</label>
              <Input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="200" />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full gap-1">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {saving ? 'جارٍ الحفظ...' : editingRule ? 'حفظ التعديلات' : 'إضافة'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
