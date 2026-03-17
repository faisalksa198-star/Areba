import { useState, useEffect, useCallback, useMemo } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Plus, Loader2, Search, Download, Trash2, Pencil, Eye, X,
  Package, Shirt, GraduationCap, ShoppingBag, Copy,
} from 'lucide-react';
import { exportSallaOrdersXlsx } from '@/lib/sallaOrderXlsxExporter';

// ===== Status config =====
const STATUS_OPTIONS: { value: string; label: string; className: string }[] = [
  { value: 'pending_data', label: 'بانتظار البيانات', className: 'bg-warning/10 text-warning border-warning/20' },
  { value: 'under_review', label: 'بانتظار المراجعة', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'in_progress', label: 'قيد التنفيذ', className: 'bg-info/10 text-info border-info/20' },
  { value: 'shipped', label: 'تم الشحن', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'completed', label: 'منتهي', className: 'bg-success/10 text-success border-success/20' },
  { value: 'cancelled', label: 'ملغي', className: 'bg-destructive/10 text-destructive border-destructive/20' },
];

const statusMap = Object.fromEntries(STATUS_OPTIONS.map(s => [s.value, s]));

const CATEGORY_LABELS: Record<string, { label: string; icon: typeof Package }> = {
  kit: { label: 'طقم', icon: Package },
  scarf: { label: 'وشاح', icon: Shirt },
  hat: { label: 'قبعة', icon: GraduationCap },
};

// ===== Types =====
interface SallaOrderItem {
  id: string;
  salla_order_id: string;
  product_id: string | null;
  category: string;
  quantity: number;
  option_values: Record<string, any>;
  notes: string | null;
  product_name?: string;
}

interface SallaOrder {
  id: string;
  salla_order_number: string;
  internal_number: number;
  status: string;
  notes: string | null;
  created_at: string;
  items: SallaOrderItem[];
}

interface SallaProduct {
  id: string;
  name: string;
  category: string;
  is_active: boolean;
  options: { label: string; field_type: string; values: string[]; is_required: boolean; default_value: string }[];
}

interface FormItem {
  product_id: string;
  category: string;
  option_values: Record<string, string>;
  notes: string;
}

export default function SallaOrders() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<SallaOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Bulk
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkExporting, setBulkExporting] = useState(false);

  // Create/Edit dialog
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<SallaOrder | null>(null);
  const [formSallaNumber, setFormSallaNumber] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formItems, setFormItems] = useState<FormItem[]>([]);
  const [saving, setSaving] = useState(false);

  // View dialog
  const [viewingOrder, setViewingOrder] = useState<SallaOrder | null>(null);

  // Delete
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Products
  const [products, setProducts] = useState<SallaProduct[]>([]);

  // ===== Load =====
  const loadOrders = useCallback(async () => {
    setLoading(true);
    const { data: ordersData } = await supabase
      .from('salla_orders')
      .select('*')
      .order('internal_number', { ascending: false });

    if (!ordersData) { setLoading(false); return; }

    const orderIds = ordersData.map(o => o.id);
    const { data: itemsData } = orderIds.length > 0
      ? await supabase.from('salla_order_items').select('*').in('salla_order_id', orderIds)
      : { data: [] };

    const productIds = [...new Set((itemsData || []).filter(i => i.product_id).map(i => i.product_id!))];
    let productNameMap: Record<string, string> = {};
    if (productIds.length > 0) {
      const { data: prods } = await supabase.from('salla_products').select('id, name').in('id', productIds);
      if (prods) productNameMap = Object.fromEntries(prods.map(p => [p.id, p.name]));
    }

    const combined: SallaOrder[] = ordersData.map(o => ({
      ...o,
      status: o.status as string,
      items: (itemsData || [])
        .filter(i => i.salla_order_id === o.id)
        .map(i => ({
          ...i,
          option_values: (i.option_values as Record<string, any>) || {},
          product_name: i.product_id ? productNameMap[i.product_id] : undefined,
        })),
    }));

    setOrders(combined);
    setLoading(false);
  }, []);

  const loadProducts = useCallback(async () => {
    const { data: prods } = await supabase.from('salla_products').select('*').eq('is_active', true);
    if (!prods) return;
    const productIds = prods.map(p => p.id);
    const { data: opts } = productIds.length > 0
      ? await supabase.from('salla_product_options').select('*').in('product_id', productIds).order('sort_order')
      : { data: [] };
    const mapped: SallaProduct[] = prods.map(p => ({
      id: p.id, name: p.name, category: (p as any).category || 'kit', is_active: p.is_active,
      options: (opts || []).filter(o => o.product_id === p.id).map(o => ({
        label: o.label, field_type: (o as any).field_type || 'dropdown',
        values: o.values || [], is_required: o.is_required,
        default_value: o.default_value || '',
      })),
    }));
    setProducts(mapped);
  }, []);

  useEffect(() => { loadOrders(); loadProducts(); }, [loadOrders, loadProducts]);

  // ===== Filtering (search by salla number or internal number only) =====
  const filtered = useMemo(() => {
    return orders.filter(o => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (search) {
        const s = search.toLowerCase().trim();
        if (!o.salla_order_number.toLowerCase().includes(s) && !String(o.internal_number).includes(s)) return false;
      }
      return true;
    });
  }, [orders, search, statusFilter]);

  // ===== Bulk =====
  const allFilteredSelected = filtered.length > 0 && filtered.every(o => selectedIds.has(o.id));
  const toggleSelectAll = () => {
    if (allFilteredSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(o => o.id)));
  };
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ===== Status change =====
  const updateStatus = async (orderId: string, newStatus: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    const { error } = await supabase.from('salla_orders').update({ status: newStatus as any }).eq('id', orderId);
    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
      loadOrders();
    }
  };

  const bulkUpdateStatus = async (newStatus: string) => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setOrders(prev => prev.map(o => ids.includes(o.id) ? { ...o, status: newStatus } : o));
    const { error } = await supabase.from('salla_orders').update({ status: newStatus as any }).in('id', ids);
    if (error) { toast({ title: 'خطأ', variant: 'destructive' }); loadOrders(); }
    else { toast({ title: `تم تحديث ${ids.length} طلب ✓` }); setSelectedIds(new Set()); }
  };

  // ===== Delete =====
  const handleDelete = async () => {
    if (!deletingId) return;
    const { error } = await supabase.from('salla_orders').delete().eq('id', deletingId);
    if (error) toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    else { toast({ title: 'تم الحذف ✓' }); setOrders(prev => prev.filter(o => o.id !== deletingId)); }
    setDeletingId(null);
  };

  // ===== Export =====
  const handleExport = async (ids?: string[]) => {
    setBulkExporting(true);
    try {
      const targetIds = ids || [...selectedIds];
      const targetOrders = orders.filter(o => targetIds.includes(o.id));
      await exportSallaOrdersXlsx(targetOrders);
      toast({ title: 'تم التصدير ✓' });
    } catch (e: any) {
      toast({ title: 'خطأ في التصدير', description: e.message, variant: 'destructive' });
    }
    setBulkExporting(false);
  };

  // ===== Form helpers =====
  const openCreate = () => {
    setEditingOrder(null);
    setFormSallaNumber(''); setFormNotes('');
    setFormItems([]);
    setShowForm(true);
  };

  const openEdit = (order: SallaOrder) => {
    setEditingOrder(order);
    setFormSallaNumber(order.salla_order_number);
    setFormNotes(order.notes || '');
    setFormItems(order.items.map(i => ({
      product_id: i.product_id || '',
      category: i.category,
      option_values: i.option_values as Record<string, string>,
      notes: i.notes || '',
    })));
    setShowForm(true);
  };

  const addNewItem = () => {
    setFormItems(prev => [...prev, { product_id: '', category: 'kit', option_values: {}, notes: '' }]);
  };

  const duplicateItem = (index: number) => {
    const source = formItems[index];
    const prod = products.find(p => p.id === source.product_id);
    // Keep dropdown values, clear text inputs
    const newOptionValues: Record<string, string> = {};
    if (prod) {
      prod.options.forEach(opt => {
        if (opt.field_type === 'text') {
          newOptionValues[opt.label] = ''; // Clear text fields
        } else {
          newOptionValues[opt.label] = source.option_values[opt.label] || '';
        }
      });
    } else {
      // No product info, copy all
      Object.assign(newOptionValues, source.option_values);
    }
    const duplicated: FormItem = {
      product_id: source.product_id,
      category: source.category,
      option_values: newOptionValues,
      notes: '',
    };
    setFormItems(prev => {
      const next = [...prev];
      next.splice(index + 1, 0, duplicated);
      return next;
    });
  };

  const updateItem = (index: number, updates: Partial<FormItem>) => {
    setFormItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const updated = { ...item, ...updates };
      if (updates.product_id && updates.product_id !== item.product_id) {
        const prod = products.find(p => p.id === updates.product_id);
        if (prod) {
          updated.category = prod.category;
          const defaults: Record<string, string> = {};
          prod.options.forEach(opt => {
            if (opt.default_value) defaults[opt.label] = opt.default_value;
          });
          updated.option_values = defaults;
        }
      }
      return updated;
    }));
  };

  const removeItem = (index: number) => {
    setFormItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!formSallaNumber.trim()) {
      toast({ title: 'يرجى إدخال رقم طلب سلة', variant: 'destructive' }); return;
    }
    setSaving(true);

    if (editingOrder) {
      const { error } = await supabase.from('salla_orders').update({
        salla_order_number: formSallaNumber.trim(),
        notes: formNotes.trim() || null,
      }).eq('id', editingOrder.id);
      if (error) { toast({ title: 'خطأ', description: error.message, variant: 'destructive' }); setSaving(false); return; }

      await supabase.from('salla_order_items').delete().eq('salla_order_id', editingOrder.id);
      if (formItems.length > 0) {
        const itemsToInsert = formItems.filter(i => i.product_id).map(i => ({
          salla_order_id: editingOrder.id,
          product_id: i.product_id,
          category: i.category,
          quantity: 1,
          option_values: i.option_values,
          notes: i.notes || null,
        }));
        if (itemsToInsert.length > 0) await supabase.from('salla_order_items').insert(itemsToInsert);
      }
    } else {
      const { data, error } = await supabase.from('salla_orders').insert({
        salla_order_number: formSallaNumber.trim(),
        notes: formNotes.trim() || null,
      }).select('id').single();
      if (error || !data) { toast({ title: 'خطأ', description: error?.message, variant: 'destructive' }); setSaving(false); return; }

      if (formItems.length > 0) {
        const itemsToInsert = formItems.filter(i => i.product_id).map(i => ({
          salla_order_id: data.id,
          product_id: i.product_id,
          category: i.category,
          quantity: 1,
          option_values: i.option_values,
          notes: i.notes || null,
        }));
        if (itemsToInsert.length > 0) await supabase.from('salla_order_items').insert(itemsToInsert);
      }
    }

    toast({ title: editingOrder ? 'تم التعديل ✓' : 'تم الإنشاء ✓' });
    setShowForm(false);
    setSaving(false);
    loadOrders();
  };

  // ===== Sub-numbering =====
  const getSubNumbers = (order: SallaOrder) => {
    if (order.items.length <= 1) return null;
    return order.items.map((_, i) => `${i + 1}/${order.items.length}`);
  };

  // ===== Render =====
  return (
    <DashboardLayout>
      <div className="space-y-4" dir="rtl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">طلبات سلة</h1>
            <p className="text-muted-foreground text-sm mt-1">إدارة الطلبات الواردة من منصة سلة</p>
          </div>
          <Button onClick={openCreate} className="gap-1.5">
            <Plus className="h-4 w-4" />
            إضافة طلب
          </Button>
        </div>

        {/* Filters & Bulk */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث برقم طلب سلة أو الرقم الداخلي..." className="pr-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="الحالة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات</SelectItem>
              {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 mr-auto">
              <Badge variant="secondary">{selectedIds.size} محدد</Badge>
              <Select onValueChange={v => bulkUpdateStatus(v)}>
                <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="تغيير الحالة" /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={() => handleExport()} disabled={bulkExporting} className="gap-1">
                {bulkExporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                تصدير Excel
              </Button>
            </div>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center">
            <ShoppingBag className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">لا توجد طلبات</p>
          </CardContent></Card>
        ) : (
          <Card>
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-right">
                      <Checkbox checked={allFilteredSelected} onCheckedChange={toggleSelectAll} />
                    </TableHead>
                    <TableHead className="text-right">رقم طلب سلة</TableHead>
                    <TableHead className="text-right">الرقم الداخلي</TableHead>
                    <TableHead className="text-right">التوابع</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right w-[120px]">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(order => {
                    const subNums = getSubNumbers(order);
                    return (
                      <TableRow key={order.id} className={selectedIds.has(order.id) ? 'bg-muted/50' : ''}>
                        <TableCell>
                          <Checkbox checked={selectedIds.has(order.id)} onCheckedChange={() => toggleSelect(order.id)} />
                        </TableCell>
                        <TableCell className="font-medium">{order.salla_order_number || '—'}</TableCell>
                        <TableCell className="font-mono text-sm">{order.internal_number}</TableCell>
                        <TableCell>
                          {subNums ? (
                            <div className="flex flex-wrap gap-1">
                              {subNums.map((sn, i) => (
                                <Badge key={i} variant="secondary" className="text-[10px] font-mono">
                                  {order.internal_number}-{sn}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">لا يوجد</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select value={order.status} onValueChange={v => updateStatus(order.id, v)}>
                            <SelectTrigger className="h-7 w-[140px] text-[11px] border-0 p-0">
                              <Badge className={`${statusMap[order.status]?.className || ''} text-[10px]`}>
                                {statusMap[order.status]?.label || order.status}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setViewingOrder(order)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(order)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeletingId(order.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleExport([order.id])} disabled={bulkExporting}>
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>

      {/* ===== Create/Edit Dialog ===== */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingOrder ? 'تعديل طلب سلة' : 'إضافة طلب سلة جديد'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Order info - only salla number and notes */}
            <div>
              <label className="text-sm font-medium mb-1 block">رقم طلب سلة *</label>
              <Input value={formSallaNumber} onChange={e => setFormSallaNumber(e.target.value)} placeholder="رقم الطلب من منصة سلة" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">ملاحظات</label>
              <Input value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="ملاحظات اختيارية" />
            </div>

            <Separator />

            {/* Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  الأصناف
                  {formItems.length > 1 && (
                    <span className="text-muted-foreground font-normal mr-2">({formItems.length} أصناف)</span>
                  )}
                </h3>
              </div>

              {formItems.map((item, idx) => {
                const selectedProduct = products.find(p => p.id === item.product_id);
                return (
                  <Card key={idx} className="relative">
                    <Button size="icon" variant="ghost" className="absolute top-2 left-2 h-6 w-6 text-destructive" onClick={() => removeItem(idx)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                    <CardContent className="pt-4 pb-3 space-y-3">
                      {/* Sub-number badge */}
                      {formItems.length > 1 && (
                        <Badge variant="secondary" className="text-[10px] font-mono">
                          صنف {idx + 1}/{formItems.length}
                        </Badge>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">التصنيف</label>
                          <Select value={item.category} onValueChange={v => updateItem(idx, { category: v, product_id: '', option_values: {} })}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="kit">أطقم</SelectItem>
                              <SelectItem value="scarf">أوشحة</SelectItem>
                              <SelectItem value="hat">قبعات</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">المنتج</label>
                          <Select value={item.product_id} onValueChange={v => updateItem(idx, { product_id: v })}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="اختر المنتج" /></SelectTrigger>
                            <SelectContent>
                              {products.filter(p => p.category === item.category).map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Dynamic options from product */}
                      {selectedProduct && selectedProduct.options.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">خصائص المنتج:</p>
                          <div className="grid grid-cols-2 gap-2">
                            {selectedProduct.options.map((opt, oi) => {
                              const isSizeButtons = opt.label === 'المقاس' && item.category === 'kit' && opt.field_type === 'dropdown';
                              return (
                              <div key={oi} className={isSizeButtons ? 'col-span-2' : ''}>
                                <label className="text-[11px] text-muted-foreground mb-0.5 block">
                                  {opt.label} {opt.is_required && <span className="text-destructive">*</span>}
                                </label>
                                {isSizeButtons ? (
                                  <div className="flex flex-wrap gap-1.5">
                                    {opt.values.map(v => {
                                      const isSelected = item.option_values[opt.label] === v;
                                      return (
                                        <button
                                          key={v}
                                          type="button"
                                          onClick={() => updateItem(idx, { option_values: { ...item.option_values, [opt.label]: v } })}
                                          className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors ${
                                            isSelected
                                              ? 'bg-primary text-primary-foreground border-primary'
                                              : 'bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground'
                                          }`}
                                        >
                                          {v}
                                        </button>
                                      );
                                    })}
                                  </div>
                                ) : opt.field_type === 'dropdown' ? (
                                  <Select
                                    value={item.option_values[opt.label] || ''}
                                    onValueChange={v => updateItem(idx, { option_values: { ...item.option_values, [opt.label]: v } })}
                                  >
                                    <SelectTrigger className="h-7 text-[11px]"><SelectValue placeholder="اختر" /></SelectTrigger>
                                    <SelectContent>
                                      {opt.values.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                ) : opt.field_type === 'checkbox' ? (
                                  <div className="flex items-center gap-2 h-7">
                                    <Switch
                                      checked={item.option_values[opt.label] === 'نعم'}
                                      onCheckedChange={v => updateItem(idx, { option_values: { ...item.option_values, [opt.label]: v ? 'نعم' : 'لا' } })}
                                    />
                                    <span className="text-[11px]">{item.option_values[opt.label] === 'نعم' ? 'نعم' : 'لا'}</span>
                                  </div>
                                ) : (
                                  <Input
                                    value={item.option_values[opt.label] || ''}
                                    onChange={e => updateItem(idx, { option_values: { ...item.option_values, [opt.label]: e.target.value } })}
                                    className="h-7 text-[11px]"
                                    placeholder={opt.label}
                                  />
                                )}
                              </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Action buttons under each item */}
                      <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="gap-1 text-xs h-7"
                          onClick={() => duplicateItem(idx)}
                          disabled={!item.product_id}
                        >
                          <Copy className="h-3 w-3" />
                          تكرار المنتج
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="gap-1 text-xs h-7"
                          onClick={addNewItem}
                        >
                          <Plus className="h-3 w-3" />
                          إضافة صنف
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {formItems.length === 0 && (
                <div className="text-center py-6 space-y-2">
                  <p className="text-muted-foreground text-xs">لم تتم إضافة أصناف بعد</p>
                  <Button size="sm" variant="outline" onClick={addNewItem} className="gap-1">
                    <Plus className="h-3.5 w-3.5" />
                    إضافة صنف
                  </Button>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>إلغاء</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin ml-1" />}
                {editingOrder ? 'حفظ التعديلات' : 'إنشاء الطلب'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== View Dialog ===== */}
      <Dialog open={!!viewingOrder} onOpenChange={() => setViewingOrder(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>تفاصيل الطلب #{viewingOrder?.internal_number}</DialogTitle>
          </DialogHeader>
          {viewingOrder && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">رقم سلة:</span> <strong>{viewingOrder.salla_order_number}</strong></div>
                <div><span className="text-muted-foreground">الرقم الداخلي:</span> <strong>{viewingOrder.internal_number}</strong></div>
                <div><span className="text-muted-foreground">الحالة:</span>{' '}
                  <Badge className={statusMap[viewingOrder.status]?.className}>{statusMap[viewingOrder.status]?.label}</Badge>
                </div>
              </div>
              {viewingOrder.notes && <div><span className="text-muted-foreground">ملاحظات:</span> {viewingOrder.notes}</div>}

              <Separator />
              <h4 className="font-semibold">الأصناف ({viewingOrder.items.length})</h4>
              {viewingOrder.items.map((item: SallaOrderItem, i: number) => {
                const cat = CATEGORY_LABELS[item.category] || CATEGORY_LABELS.kit;
                const subNum = viewingOrder.items.length > 1 ? `${viewingOrder.internal_number}-${i + 1}/${viewingOrder.items.length}` : null;
                return (
                  <Card key={i}>
                    <CardContent className="py-2 px-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] gap-0.5"><cat.icon className="h-3 w-3" />{cat.label}</Badge>
                        <span className="font-medium text-xs">{item.product_name || '—'}</span>
                        {subNum && <Badge variant="secondary" className="text-[10px] font-mono mr-auto">{subNum}</Badge>}
                      </div>
                      {Object.keys(item.option_values).length > 0 && (
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                          {Object.entries(item.option_values).map(([k, v]) => (
                            <span key={k}>{k}: <strong className="text-foreground">{String(v)}</strong></span>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== Delete Confirm ===== */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الطلب؟</AlertDialogTitle>
            <AlertDialogDescription>سيتم حذف الطلب وجميع أصنافه نهائياً.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
