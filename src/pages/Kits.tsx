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
import { Plus, Pencil, Trash2, Loader2, Package, Eye, ImagePlus, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface SelectOption { id: string; name: string; }

interface KitRow {
  id: string;
  name: string;
  is_active: boolean;
  image_url: string | null;
  abaya_design_id: string | null;
  sleeve_style_id: string | null;
  scarf_style_id: string | null;
  scarf_method_id: string | null;
  font_id: string | null;
  date_type_id: string | null;
  embroidery_direction_id: string | null;
  embroidery_color: string | null;
  scarf_color: string | null;
  scarf_color_degree: string | null;
  sleeve_color: string | null;
  abaya_color: string | null;
  abaya_color_degree: string | null;
  hat_color: string | null;
  hat_color_degree: string | null;
}

const EMBROIDERY_COLORS = [
  { value: 'فضي', label: 'فضي' },
  { value: 'ذهبي', label: 'ذهبي' },
  { value: 'أسود', label: 'أسود' },
  { value: 'أبيض', label: 'أبيض' },
];

export default function Kits() {
  const { toast } = useToast();
  const [kits, setKits] = useState<KitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingKit, setEditingKit] = useState<KitRow | null>(null);
  const [previewKit, setPreviewKit] = useState<KitRow | null>(null);
  const [saving, setSaving] = useState(false);

  // Master data
  const [abayaDesigns, setAbayaDesigns] = useState<SelectOption[]>([]);
  const [sleeveStyles, setSleeveStyles] = useState<SelectOption[]>([]);
  const [scarfStyles, setScarfStyles] = useState<SelectOption[]>([]);
  const [scarfMethods, setScarfMethods] = useState<SelectOption[]>([]);
  const [fonts, setFonts] = useState<SelectOption[]>([]);
  const [dateTypes, setDateTypes] = useState<SelectOption[]>([]);
  const [embroideryDirections, setEmbroideryDirections] = useState<SelectOption[]>([]);

  // Form state
  const [f, setF] = useState({
    name: '',
    abaya_design_id: '', sleeve_style_id: '', scarf_style_id: '',
    scarf_method_id: '', font_id: '',
    date_type_id: '', embroidery_direction_id: '', embroidery_color: '',
    scarf_color: '', scarf_color_degree: '', sleeve_color: '',
    abaya_color: '', abaya_color_degree: '',
    hat_color: '', hat_color_degree: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');

  const setField = (key: string, val: string) => setF(prev => ({ ...prev, [key]: val }));

  useEffect(() => {
    loadKits();
    loadMasterData();
  }, []);

  const loadKits = async () => {
    setLoading(true);
    const { data } = await supabase.from('ready_kits').select('*').order('name', { ascending: true });
    setKits((data as KitRow[]) || []);
    setLoading(false);
  };

  const loadMasterData = async () => {
    const [a, sl, sc, sm, fo, dt, ed] = await Promise.all([
      supabase.from('abaya_designs').select('id, name').eq('is_active', true),
      supabase.from('sleeve_styles').select('id, name').eq('is_active', true),
      supabase.from('scarf_styles').select('id, name').eq('is_active', true),
      supabase.from('scarf_methods').select('id, name').eq('is_active', true),
      supabase.from('fonts').select('id, name').eq('is_active', true),
      supabase.from('date_types').select('id, name').eq('is_active', true),
      supabase.from('embroidery_directions').select('id, name').eq('is_active', true),
    ]);
    setAbayaDesigns(a.data || []);
    setSleeveStyles(sl.data || []);
    setScarfStyles(sc.data || []);
    setScarfMethods(sm.data || []);
    setFonts(fo.data || []);
    setDateTypes(dt.data || []);
    setEmbroideryDirections(ed.data || []);
  };

  const emptyForm = {
    name: '',
    abaya_design_id: '', sleeve_style_id: '', scarf_style_id: '',
    scarf_method_id: '', font_id: '',
    date_type_id: '', embroidery_direction_id: '', embroidery_color: '',
    scarf_color: '', scarf_color_degree: '', sleeve_color: '',
    abaya_color: '', abaya_color_degree: '',
    hat_color: '', hat_color_degree: '',
  };

  const openCreate = () => {
    setEditingKit(null);
    setF(emptyForm);
    setImageFile(null);
    setImagePreview('');
    setShowForm(true);
  };

  const openEdit = (kit: KitRow) => {
    setEditingKit(kit);
    setF({
      name: kit.name,
      abaya_design_id: kit.abaya_design_id || '',
      sleeve_style_id: kit.sleeve_style_id || '',
      scarf_style_id: kit.scarf_style_id || '',
      scarf_method_id: kit.scarf_method_id || '',
      font_id: kit.font_id || '',
      date_type_id: kit.date_type_id || '',
      embroidery_direction_id: kit.embroidery_direction_id || '',
      embroidery_color: kit.embroidery_color || '',
      scarf_color: kit.scarf_color || '',
      scarf_color_degree: kit.scarf_color_degree || '',
      sleeve_color: kit.sleeve_color || '',
      abaya_color: kit.abaya_color || '',
      abaya_color_degree: kit.abaya_color_degree || '',
      hat_color: kit.hat_color || '',
      hat_color_degree: kit.hat_color_degree || '',
    });
    setImageFile(null);
    setImagePreview(kit.image_url || '');
    setShowForm(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!f.name.trim()) {
      toast({ title: 'يرجى إدخال اسم الطقم', variant: 'destructive' });
      return;
    }
    setSaving(true);

    let imageUrl: string | null = imagePreview || null;
    if (imageFile) {
      const ext = imageFile.name.split('.').pop();
      const path = `kits/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('images').upload(path, imageFile);
      if (!upErr) {
        const { data: urlData } = supabase.storage.from('images').getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }
    }

    const record: any = {
      name: f.name.trim(),
      image_url: imageUrl,
      abaya_design_id: f.abaya_design_id || null,
      sleeve_style_id: f.sleeve_style_id || null,
      scarf_style_id: f.scarf_style_id || null,
      scarf_method_id: f.scarf_method_id || null,
      font_id: f.font_id || null,
      date_type_id: f.date_type_id || null,
      embroidery_direction_id: f.embroidery_direction_id || null,
      embroidery_color: f.embroidery_color || null,
      scarf_color: f.scarf_color || null,
      scarf_color_degree: f.scarf_color_degree || null,
      sleeve_color: f.sleeve_color || null,
      abaya_color: f.abaya_color || null,
      abaya_color_degree: f.abaya_color_degree || null,
      hat_color: f.hat_color || null,
      hat_color_degree: f.hat_color_degree || null,
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

  const toggleKitActive = async (kit: KitRow) => {
    const { error } = await supabase.from('ready_kits').update({ is_active: !kit.is_active }).eq('id', kit.id);
    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
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
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            {kits.map(kit => (
              <Card key={kit.id} className={`overflow-hidden border-border/50 ${!kit.is_active ? 'opacity-50' : ''}`}>
                <div className="aspect-video relative bg-muted">
                  {kit.image_url ? (
                    <img src={kit.image_url} alt={kit.name} className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-12 w-12 text-muted-foreground/20" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-background/80 backdrop-blur-sm rounded-full px-2 py-1">
                    <span className="text-[10px] font-medium text-foreground">{kit.is_active ? 'مفعّل' : 'معطّل'}</span>
                    <Switch
                      checked={kit.is_active}
                      onCheckedChange={() => toggleKitActive(kit)}
                      className="scale-75"
                    />
                  </div>
                </div>
                <CardContent className="p-3">
                  <p className="font-bold text-foreground text-sm mb-2">{kit.name}</p>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setPreviewKit(kit)} className="h-7 px-2 text-xs gap-1">
                      <Eye className="h-3 w-3" />
                      استعراض
                    </Button>
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

      {/* Preview Dialog */}
      <Dialog open={!!previewKit} onOpenChange={() => setPreviewKit(null)}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>تفاصيل الطقم: {previewKit?.name}</DialogTitle>
          </DialogHeader>
          {previewKit && (
            <div className="space-y-3 mt-2">
              {previewKit.image_url && (
                <img src={previewKit.image_url} alt={previewKit.name} className="w-full aspect-video object-contain rounded-lg bg-muted" />
              )}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-muted-foreground">
                <span>التصميم: <strong className="text-foreground">{findName(abayaDesigns, previewKit.abaya_design_id)}</strong></span>
                <span>الكم: <strong className="text-foreground">{findName(sleeveStyles, previewKit.sleeve_style_id)}</strong></span>
                <span>الوشاح: <strong className="text-foreground">{findName(scarfStyles, previewKit.scarf_style_id)}</strong></span>
                <span>أطراف الوشاح: <strong className="text-foreground">{findName(scarfMethods, previewKit.scarf_method_id)}</strong></span>
                <span>خط التطريز: <strong className="text-foreground">{findName(fonts, previewKit.font_id)}</strong></span>
                <span>نوع التاريخ: <strong className="text-foreground">{findName(dateTypes, previewKit.date_type_id)}</strong></span>
                <span>اتجاه التطريز: <strong className="text-foreground">{findName(embroideryDirections, previewKit.embroidery_direction_id)}</strong></span>
                {previewKit.embroidery_color && <span>لون التطريز: <strong className="text-foreground">{previewKit.embroidery_color}</strong></span>}
                {previewKit.abaya_color && <span>لون العباية: <strong className="text-foreground">{previewKit.abaya_color} {previewKit.abaya_color_degree || ''}</strong></span>}
                {previewKit.scarf_color && <span>لون الوشاح: <strong className="text-foreground">{previewKit.scarf_color} {previewKit.scarf_color_degree || ''}</strong></span>}
                {previewKit.hat_color && <span>لون القبعة: <strong className="text-foreground">{previewKit.hat_color} {previewKit.hat_color_degree || ''}</strong></span>}
                {previewKit.sleeve_color && <span>لون طرف الكم: <strong className="text-foreground">{previewKit.sleeve_color}</strong></span>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Kit Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingKit ? `تعديل: ${editingKit.name}` : 'إنشاء طقم جديد'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Name */}
            <div>
              <label className="text-sm font-medium mb-1 block">اسم الطقم *</label>
              <Input value={f.name} onChange={e => setField('name', e.target.value)} placeholder="مثال: طقم الرونق" />
            </div>

            {/* Image Upload */}
            <div>
              <label className="text-sm font-medium mb-1 block">صورة الطقم</label>
              {imagePreview ? (
                <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-border bg-muted">
                  <img src={imagePreview} className="w-full h-full object-contain" />
                  <button onClick={() => { setImageFile(null); setImagePreview(''); }} className="absolute top-2 left-2 bg-destructive text-destructive-foreground rounded-full p-1">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full aspect-video rounded-lg border-2 border-dashed border-border cursor-pointer hover:bg-muted/50 transition-colors">
                  <ImagePlus className="h-8 w-8 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">اضغط لرفع صورة</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              )}
            </div>

            <h3 className="text-sm font-bold text-foreground border-b border-border pb-1">العناصر الأساسية</h3>

            <div className="grid grid-cols-2 gap-3">
              <FormSelect label="تصميم العباية" value={f.abaya_design_id} options={abayaDesigns} onChange={v => setField('abaya_design_id', v)} />
              <FormSelect label="طرف الكم" value={f.sleeve_style_id} options={sleeveStyles} onChange={v => setField('sleeve_style_id', v)} />
              <FormSelect label="شكل الوشاح" value={f.scarf_style_id} options={scarfStyles} onChange={v => setField('scarf_style_id', v)} />
              <FormSelect label="أطراف الوشاح" value={f.scarf_method_id} options={scarfMethods} onChange={v => setField('scarf_method_id', v)} />
              <FormSelect label="خط التطريز" value={f.font_id} options={fonts} onChange={v => setField('font_id', v)} />
              <FormSelect label="نوع التاريخ" value={f.date_type_id} options={dateTypes} onChange={v => setField('date_type_id', v)} />
              <FormSelect label="اتجاه التطريز" value={f.embroidery_direction_id} options={embroideryDirections} onChange={v => setField('embroidery_direction_id', v)} />
              <div>
                <label className="text-xs font-medium mb-1 block">لون التطريز</label>
                <Select value={f.embroidery_color} onValueChange={v => setField('embroidery_color', v)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="اختر" />
                  </SelectTrigger>
                  <SelectContent>
                    {EMBROIDERY_COLORS.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
              <div className="col-span-2">
                <label className="text-xs font-medium mb-1 block">لون طرف الكم</label>
                <Input value={f.sleeve_color} onChange={e => setField('sleeve_color', e.target.value)} placeholder="لون طرف الكم" />
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
