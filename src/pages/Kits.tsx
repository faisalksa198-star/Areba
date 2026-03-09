import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Pencil, Trash2, Loader2, Package } from 'lucide-react';

interface SelectOption { id: string; name: string; }

interface KitRow {
  id: string;
  name: string;
  is_active: boolean;
  price: number | null;
  abaya_design_id: string | null;
  sleeve_style_id: string | null;
  scarf_style_id: string | null;
  scarf_method_id: string | null;
  font_id: string | null;
  hat_style_id: string | null;
  scarf_color: string | null;
  scarf_color_degree: string | null;
  sleeve_color: string | null;
  abaya_color: string | null;
  abaya_color_degree: string | null;
  hat_color: string | null;
  hat_color_degree: string | null;
  default_scarf_design: string | null;
}

export default function Kits() {
  const { toast } = useToast();
  const [kits, setKits] = useState<KitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingKit, setEditingKit] = useState<KitRow | null>(null);
  const [saving, setSaving] = useState(false);

  // Master data
  const [abayaDesigns, setAbayaDesigns] = useState<SelectOption[]>([]);
  const [sleeveStyles, setSleeveStyles] = useState<SelectOption[]>([]);
  const [scarfStyles, setScarfStyles] = useState<SelectOption[]>([]);
  const [scarfMethods, setScarfMethods] = useState<SelectOption[]>([]);
  const [fonts, setFonts] = useState<SelectOption[]>([]);
  const [hatStyles, setHatStyles] = useState<SelectOption[]>([]);

  // Form state
  const [f, setF] = useState({
    name: '', price: '',
    abaya_design_id: '', sleeve_style_id: '', scarf_style_id: '',
    scarf_method_id: '', font_id: '', hat_style_id: '',
    scarf_color: '', scarf_color_degree: '', sleeve_color: '',
    abaya_color: '', abaya_color_degree: '',
    hat_color: '', hat_color_degree: '', default_scarf_design: '',
  });

  const setField = (key: string, val: string) => setF(prev => ({ ...prev, [key]: val }));

  useEffect(() => {
    loadKits();
    loadMasterData();
  }, []);

  const loadKits = async () => {
    setLoading(true);
    const { data } = await supabase.from('ready_kits').select('*').order('created_at', { ascending: false });
    setKits((data as KitRow[]) || []);
    setLoading(false);
  };

  const loadMasterData = async () => {
    const [a, sl, sc, sm, fo, hs] = await Promise.all([
      supabase.from('abaya_designs').select('id, name').eq('is_active', true),
      supabase.from('sleeve_styles').select('id, name').eq('is_active', true),
      supabase.from('scarf_styles').select('id, name').eq('is_active', true),
      supabase.from('scarf_methods').select('id, name').eq('is_active', true),
      supabase.from('fonts').select('id, name').eq('is_active', true),
      supabase.from('hat_styles').select('id, name').eq('is_active', true),
    ]);
    setAbayaDesigns(a.data || []);
    setSleeveStyles(sl.data || []);
    setScarfStyles(sc.data || []);
    setScarfMethods(sm.data || []);
    setFonts(fo.data || []);
    setHatStyles(hs.data || []);
  };

  const openCreate = () => {
    setEditingKit(null);
    setF({
      name: '', price: '',
      abaya_design_id: '', sleeve_style_id: '', scarf_style_id: '',
      scarf_method_id: '', font_id: '', hat_style_id: '',
      scarf_color: '', scarf_color_degree: '', sleeve_color: '',
      abaya_color: '', abaya_color_degree: '',
      hat_color: '', hat_color_degree: '', default_scarf_design: '',
    });
    setShowForm(true);
  };

  const openEdit = (kit: KitRow) => {
    setEditingKit(kit);
    setF({
      name: kit.name,
      price: kit.price?.toString() || '',
      abaya_design_id: kit.abaya_design_id || '',
      sleeve_style_id: kit.sleeve_style_id || '',
      scarf_style_id: kit.scarf_style_id || '',
      scarf_method_id: kit.scarf_method_id || '',
      font_id: kit.font_id || '',
      hat_style_id: kit.hat_style_id || '',
      scarf_color: kit.scarf_color || '',
      scarf_color_degree: kit.scarf_color_degree || '',
      sleeve_color: kit.sleeve_color || '',
      abaya_color: kit.abaya_color || '',
      abaya_color_degree: kit.abaya_color_degree || '',
      hat_color: kit.hat_color || '',
      hat_color_degree: kit.hat_color_degree || '',
      default_scarf_design: kit.default_scarf_design || '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!f.name.trim()) {
      toast({ title: 'يرجى إدخال اسم الطقم', variant: 'destructive' });
      return;
    }
    setSaving(true);

    const record: any = {
      name: f.name.trim(),
      price: f.price ? parseFloat(f.price) : null,
      abaya_design_id: f.abaya_design_id || null,
      sleeve_style_id: f.sleeve_style_id || null,
      scarf_style_id: f.scarf_style_id || null,
      scarf_method_id: f.scarf_method_id || null,
      font_id: f.font_id || null,
      hat_style_id: f.hat_style_id || null,
      scarf_color: f.scarf_color || null,
      scarf_color_degree: f.scarf_color_degree || null,
      sleeve_color: f.sleeve_color || null,
      abaya_color: f.abaya_color || null,
      abaya_color_degree: f.abaya_color_degree || null,
      hat_color: f.hat_color || null,
      hat_color_degree: f.hat_color_degree || null,
      default_scarf_design: f.default_scarf_design || null,
    };

    let error;
    if (editingKit) {
      ({ error } = await supabase.from('ready_kits').update(record).eq('id', editingKit.id));
    } else {
      ({ error } = await supabase.from('ready_kits').insert(record));
    }

    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: editingKit ? 'تم التعديل ✓' : 'تمت الإضافة ✓' });
      setShowForm(false);
      loadKits();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('ready_kits').delete().eq('id', id);
    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم الحذف ✓' });
      loadKits();
    }
  };

  const findName = (list: SelectOption[], id: string | null) => list.find(i => i.id === id)?.name || '—';

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">الأطقم الجاهزة</h1>
            <p className="text-muted-foreground text-sm mt-1">إنشاء وإدارة أطقم العبايات المركبة</p>
          </div>
          <Button onClick={openCreate} className="gap-1.5">
            <Plus className="h-4 w-4" />
            طقم جديد
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : kits.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm">لا توجد أطقم بعد</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
            {kits.map(kit => (
              <Card key={kit.id} className={`border-border/50 ${!kit.is_active ? 'opacity-50' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-foreground">{kit.name}</p>
                      {kit.price && <p className="text-sm text-muted-foreground">{kit.price} ر.س</p>}
                    </div>
                    <Badge variant={kit.is_active ? 'secondary' : 'outline'} className="text-[10px]">
                      {kit.is_active ? 'مفعّل' : 'معطّل'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>التصميم: <strong className="text-foreground">{findName(abayaDesigns, kit.abaya_design_id)}</strong></span>
                    <span>الكم: <strong className="text-foreground">{findName(sleeveStyles, kit.sleeve_style_id)}</strong></span>
                    <span>الوشاح: <strong className="text-foreground">{findName(scarfStyles, kit.scarf_style_id)}</strong></span>
                    <span>الخط: <strong className="text-foreground">{findName(fonts, kit.font_id)}</strong></span>
                    {kit.abaya_color && <span>لون العباية: <strong className="text-foreground">{kit.abaya_color}</strong></span>}
                    {kit.scarf_color && <span>لون الوشاح: <strong className="text-foreground">{kit.scarf_color}</strong></span>}
                  </div>
                  <div className="flex gap-1 mt-3">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(kit)} className="h-7 px-2 text-xs gap-1">
                      <Pencil className="h-3 w-3" />
                      تعديل
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(kit.id)} className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive">
                      <Trash2 className="h-3 w-3" />
                      حذف
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Kit Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingKit ? `تعديل: ${editingKit.name}` : 'إنشاء طقم جديد'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-sm font-medium mb-1 block">اسم الطقم *</label>
                <Input value={f.name} onChange={e => setField('name', e.target.value)} placeholder="مثال: طقم الرونق" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">السعر</label>
                <Input value={f.price} onChange={e => setField('price', e.target.value)} placeholder="0.00" type="number" />
              </div>
            </div>

            <h3 className="text-sm font-bold text-foreground border-b border-border pb-1">العناصر الأساسية</h3>

            <div className="grid grid-cols-2 gap-3">
              <FormSelect label="تصميم العباية" value={f.abaya_design_id} options={abayaDesigns} onChange={v => setField('abaya_design_id', v)} />
              <FormSelect label="طرف الكم" value={f.sleeve_style_id} options={sleeveStyles} onChange={v => setField('sleeve_style_id', v)} />
              <FormSelect label="شكل الوشاح" value={f.scarf_style_id} options={scarfStyles} onChange={v => setField('scarf_style_id', v)} />
              <FormSelect label="طريقة الوشاح" value={f.scarf_method_id} options={scarfMethods} onChange={v => setField('scarf_method_id', v)} />
              <FormSelect label="الخط" value={f.font_id} options={fonts} onChange={v => setField('font_id', v)} />
              <FormSelect label="شكل القبعة" value={f.hat_style_id} options={hatStyles} onChange={v => setField('hat_style_id', v)} />
            </div>

            <h3 className="text-sm font-bold text-foreground border-b border-border pb-1">الألوان</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block">لون العباية</label>
                <Input value={f.abaya_color} onChange={e => setField('abaya_color', e.target.value)} placeholder="مثال: أسود" />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">درجة لون العباية</label>
                <Input value={f.abaya_color_degree} onChange={e => setField('abaya_color_degree', e.target.value)} placeholder="مثال: غامق" />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">لون الكم</label>
                <Input value={f.sleeve_color} onChange={e => setField('sleeve_color', e.target.value)} placeholder="لون طرف الكم" />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">لون الوشاح</label>
                <Input value={f.scarf_color} onChange={e => setField('scarf_color', e.target.value)} placeholder="لون الوشاح" />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">درجة لون الوشاح</label>
                <Input value={f.scarf_color_degree} onChange={e => setField('scarf_color_degree', e.target.value)} placeholder="درجة اللون" />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">لون القبعة</label>
                <Input value={f.hat_color} onChange={e => setField('hat_color', e.target.value)} placeholder="لون القبعة" />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">درجة لون القبعة</label>
                <Input value={f.hat_color_degree} onChange={e => setField('hat_color_degree', e.target.value)} placeholder="درجة اللون" />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">تصميم وشاح افتراضي</label>
                <Input value={f.default_scarf_design} onChange={e => setField('default_scarf_design', e.target.value)} placeholder="وصف التصميم" />
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full gap-1 mt-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {saving ? 'جارٍ الحفظ...' : editingKit ? 'حفظ التعديلات' : 'إنشاء الطقم'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function FormSelect({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-medium mb-1 block">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 text-xs">
          <SelectValue placeholder="اختر" />
        </SelectTrigger>
        <SelectContent>
          {options.map(opt => (
            <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
