import { useState, useEffect, useCallback, KeyboardEvent } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Plus, Pencil, Trash2, Loader2, ImagePlus, X, Search, Copy,
} from 'lucide-react';

const EMBROIDERY_COLORS = [
  { value: 'فضي', label: 'فضي' },
  { value: 'ذهبي', label: 'ذهبي' },
  { value: 'أسود', label: 'أسود' },
  { value: 'أبيض', label: 'أبيض' },
];

interface MasterDataItem {
  id: string;
  name: string;
  is_active: boolean;
}

type FieldType = 'dropdown' | 'text' | 'checkbox';

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'dropdown', label: 'قائمة منسدلة' },
  { value: 'text', label: 'مربع نص' },
  { value: 'checkbox', label: 'مربع اختيار (نعم/لا)' },
];

interface ProductOption {
  id?: string;
  label: string;
  values: string[];
  is_required: boolean;
  default_value: string;
  sort_order: number;
  field_type: FieldType;
}

interface SallaProduct {
  id: string;
  name: string;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  options?: ProductOption[];
  abaya_design_id: string | null;
  sleeve_style_id: string | null;
  scarf_style_id: string | null;
  scarf_method_id: string | null;
  hat_style_id: string | null;
  font_id: string | null;
  date_type_id: string | null;
  embroidery_direction_id: string | null;
  embroidery_color: string | null;
  abaya_color: string | null;
  abaya_color_degree: string | null;
  scarf_color: string | null;
  scarf_color_degree: string | null;
  hat_color: string | null;
  hat_color_degree: string | null;
  sleeve_color: string | null;
}

export default function SallaProductsContent() {
  const { toast } = useToast();
  const [products, setProducts] = useState<SallaProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [masterData, setMasterData] = useState<Record<string, MasterDataItem[]>>({});

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<SallaProduct | null>(null);
  const [formName, setFormName] = useState('');
  const [formImage, setFormImage] = useState<File | null>(null);
  const [formImagePreview, setFormImagePreview] = useState('');
  const [formOptions, setFormOptions] = useState<ProductOption[]>([]);
  const [saving, setSaving] = useState(false);

  // Kit-like default fields
  const [formDefaults, setFormDefaults] = useState({
    abaya_design_id: '',
    sleeve_style_id: '',
    scarf_style_id: '',
    scarf_method_id: '',
    hat_style_id: '',
    font_id: '',
    date_type_id: '',
    embroidery_direction_id: '',
    embroidery_color: '',
    abaya_color: '',
    abaya_color_degree: '',
    scarf_color: '',
    scarf_color_degree: '',
    hat_color: '',
    hat_color_degree: '',
    sleeve_color: '',
  });

  const MASTER_TABLES = ['abaya_designs', 'sleeve_styles', 'scarf_styles', 'scarf_methods', 'fonts', 'date_types', 'embroidery_directions', 'hat_styles'] as const;

  const loadMasterData = useCallback(async () => {
    const results = await Promise.all(
      MASTER_TABLES.map(table =>
        supabase.from(table).select('id, name, is_active').eq('is_active', true).order('sort_order', { ascending: true })
      )
    );
    const data: Record<string, MasterDataItem[]> = {};
    MASTER_TABLES.forEach((table, i) => {
      data[table] = (results[i].data as MasterDataItem[]) || [];
    });
    setMasterData(data);
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('salla_products')
      .select('*')
      .order('sort_order', { ascending: true });

    if (data) {
      const productIds = data.map(p => p.id);
      const { data: options } = await supabase
        .from('salla_product_options')
        .select('*')
        .in('product_id', productIds.length > 0 ? productIds : ['none'])
        .order('sort_order', { ascending: true });

      const productsWithOptions = data.map(p => ({
        ...p,
        options: (options || []).filter(o => o.product_id === p.id).map(o => ({
          id: o.id,
          label: o.label,
          values: o.values || [],
          is_required: o.is_required,
          default_value: o.default_value || '',
          sort_order: o.sort_order || 0,
          field_type: (o as any).field_type || 'dropdown',
        })),
      }));
      setProducts(productsWithOptions as SallaProduct[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProducts();
    loadMasterData();
  }, [loadProducts, loadMasterData]);

  const filtered = products.filter(p => {
    const matchesSearch = !search || p.name.includes(search);
    const matchesArchive = showArchived ? !p.is_active : p.is_active;
    return matchesSearch && matchesArchive;
  });

  const resetFormDefaults = (product?: SallaProduct | null) => {
    setFormDefaults({
      abaya_design_id: product?.abaya_design_id || '',
      sleeve_style_id: product?.sleeve_style_id || '',
      scarf_style_id: product?.scarf_style_id || '',
      scarf_method_id: product?.scarf_method_id || '',
      hat_style_id: product?.hat_style_id || '',
      font_id: product?.font_id || '',
      date_type_id: product?.date_type_id || '',
      embroidery_direction_id: product?.embroidery_direction_id || '',
      embroidery_color: product?.embroidery_color || '',
      abaya_color: product?.abaya_color || '',
      abaya_color_degree: product?.abaya_color_degree || '',
      scarf_color: product?.scarf_color || '',
      scarf_color_degree: product?.scarf_color_degree || '',
      hat_color: product?.hat_color || '',
      hat_color_degree: product?.hat_color_degree || '',
      sleeve_color: product?.sleeve_color || '',
    });
  };

  const openCreate = () => {
    setEditingProduct(null);
    setFormName('');
    setFormImage(null);
    setFormImagePreview('');
    setFormOptions([]);
    resetFormDefaults(null);
    setShowForm(true);
  };

  const openEdit = (product: SallaProduct) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormImage(null);
    setFormImagePreview(product.image_url || '');
    setFormOptions(product.options || []);
    resetFormDefaults(product);
    setShowForm(true);
  };

  const duplicateProduct = (product: SallaProduct) => {
    setEditingProduct(null);
    setFormName('');
    setFormImage(null);
    setFormImagePreview('');
    setFormOptions(
      (product.options || []).map(o => ({
        label: o.label,
        values: [...o.values],
        is_required: o.is_required,
        default_value: o.default_value,
        sort_order: o.sort_order,
        field_type: o.field_type,
      }))
    );
    resetFormDefaults(product);
    setShowForm(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormImage(file);
    setFormImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop();
    const path = `salla_products/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('images').upload(path, file);
    if (error) {
      toast({ title: 'خطأ في رفع الصورة', description: error.message, variant: 'destructive' });
      return null;
    }
    const { data } = supabase.storage.from('images').getPublicUrl(path);
    return data.publicUrl;
  };

  const addOption = () => {
    setFormOptions(prev => [...prev, {
      label: '',
      values: [],
      is_required: false,
      default_value: '',
      sort_order: prev.length,
      field_type: 'dropdown' as FieldType,
    }]);
  };

  const updateOption = (index: number, updates: Partial<ProductOption>) => {
    setFormOptions(prev => prev.map((opt, i) => i === index ? { ...opt, ...updates } : opt));
  };

  const removeOption = (index: number) => {
    setFormOptions(prev => prev.filter((_, i) => i !== index));
  };

  // Add a value to an option's values array
  const addValueToOption = (index: number, value: string) => {
    if (!value.trim()) return;
    setFormOptions(prev => prev.map((opt, i) => {
      if (i !== index) return opt;
      if (opt.values.includes(value.trim())) return opt;
      return { ...opt, values: [...opt.values, value.trim()] };
    }));
  };

  const removeValueFromOption = (optIndex: number, valIndex: number) => {
    setFormOptions(prev => prev.map((opt, i) => {
      if (i !== optIndex) return opt;
      return { ...opt, values: opt.values.filter((_, vi) => vi !== valIndex) };
    }));
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast({ title: 'يرجى إدخال اسم المنتج', variant: 'destructive' });
      return;
    }
    setSaving(true);

    let imageUrl = editingProduct?.image_url || null;
    if (formImage) {
      imageUrl = await uploadImage(formImage);
      if (!imageUrl) { setSaving(false); return; }
    }

    const productData = {
      name: formName.trim(),
      image_url: imageUrl,
      abaya_design_id: formDefaults.abaya_design_id || null,
      sleeve_style_id: formDefaults.sleeve_style_id || null,
      scarf_style_id: formDefaults.scarf_style_id || null,
      scarf_method_id: formDefaults.scarf_method_id || null,
      hat_style_id: formDefaults.hat_style_id || null,
      font_id: formDefaults.font_id || null,
      date_type_id: formDefaults.date_type_id || null,
      embroidery_direction_id: formDefaults.embroidery_direction_id || null,
      embroidery_color: formDefaults.embroidery_color || null,
      abaya_color: formDefaults.abaya_color || null,
      abaya_color_degree: formDefaults.abaya_color_degree || null,
      scarf_color: formDefaults.scarf_color || null,
      scarf_color_degree: formDefaults.scarf_color_degree || null,
      hat_color: formDefaults.hat_color || null,
      hat_color_degree: formDefaults.hat_color_degree || null,
      sleeve_color: formDefaults.sleeve_color || null,
    };

    let productId: string;

    if (editingProduct) {
      const { error } = await supabase
        .from('salla_products')
        .update(productData)
        .eq('id', editingProduct.id);
      if (error) {
        toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
        setSaving(false);
        return;
      }
      productId = editingProduct.id;
      await supabase.from('salla_product_options').delete().eq('product_id', productId);
    } else {
      const { data, error } = await supabase
        .from('salla_products')
        .insert(productData)
        .select('id')
        .single();
      if (error || !data) {
        toast({ title: 'خطأ', description: error?.message, variant: 'destructive' });
        setSaving(false);
        return;
      }
      productId = data.id;
    }

    const validOptions = formOptions.filter(o => o.label.trim());
    if (validOptions.length > 0) {
      const optionsToInsert = validOptions.map((o, i) => ({
        product_id: productId,
        label: o.label.trim(),
        values: o.field_type === 'dropdown' ? o.values : [],
        is_required: o.is_required,
        default_value: o.default_value || null,
        sort_order: i,
        field_type: o.field_type,
      }));
      const { error } = await supabase.from('salla_product_options').insert(optionsToInsert);
      if (error) {
        toast({ title: 'خطأ في حفظ الخصائص', description: error.message, variant: 'destructive' });
      }
    }

    toast({ title: editingProduct ? 'تم التعديل ✓' : 'تمت الإضافة ✓' });
    setShowForm(false);
    loadProducts();
    setSaving(false);
  };

  const toggleActive = async (product: SallaProduct) => {
    const newStatus = !product.is_active;
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_active: newStatus } : p));
    const { error } = await supabase.from('salla_products').update({ is_active: newStatus }).eq('id', product.id);
    if (error) {
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_active: !newStatus } : p));
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: newStatus ? 'تم التفعيل ✓' : 'تم إلغاء التفعيل ✓' });
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('salla_products').delete().eq('id', id);
    if (error) {
      toast({ title: 'خطأ في الحذف', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم الحذف ✓' });
      setProducts(prev => prev.filter(p => p.id !== id));
    }
  };

  const getMasterName = (table: string, id: string | null) => {
    if (!id || !masterData[table]) return null;
    return masterData[table].find(i => i.id === id)?.name || null;
  };

  const DROPDOWN_FIELDS = [
    { key: 'abaya_design_id', label: 'تصميم العباية', table: 'abaya_designs' },
    { key: 'sleeve_style_id', label: 'طرف الكم', table: 'sleeve_styles' },
    { key: 'scarf_style_id', label: 'شكل الوشاح', table: 'scarf_styles' },
    { key: 'scarf_method_id', label: 'أطراف الوشاح', table: 'scarf_methods' },
    { key: 'hat_style_id', label: 'شكل القبعة', table: 'hat_styles' },
    { key: 'font_id', label: 'خط التطريز', table: 'fonts' },
    { key: 'date_type_id', label: 'نوع التاريخ', table: 'date_types' },
    { key: 'embroidery_direction_id', label: 'اتجاه التطريز', table: 'embroidery_directions' },
  ] as const;

  const COLOR_FIELDS = [
    { key: 'abaya_color', label: 'لون العباية' },
    { key: 'abaya_color_degree', label: 'درجة لون العباية' },
    { key: 'scarf_color', label: 'لون الوشاح' },
    { key: 'scarf_color_degree', label: 'درجة لون الوشاح' },
    { key: 'hat_color', label: 'لون القبعة' },
    { key: 'hat_color_degree', label: 'درجة لون القبعة' },
    { key: 'sleeve_color', label: 'لون الكم' },
  ] as const;

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث عن منتج..."
            className="pr-9"
          />
        </div>
        <Button
          variant={showArchived ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => setShowArchived(!showArchived)}
          className="gap-1"
        >
          {showArchived ? 'عرض النشطة' : 'عرض غير النشطة'}
        </Button>
        <Button size="sm" onClick={openCreate} className="gap-1 mr-auto">
          <Plus className="h-3.5 w-3.5" />
          إضافة منتج
        </Button>
      </div>

      {/* Products grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground text-sm">
              {showArchived ? 'لا توجد منتجات غير نشطة' : 'لا توجد منتجات بعد'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(product => (
            <Card key={product.id} className={`border-border/50 transition-opacity ${!product.is_active ? 'opacity-60' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {product.image_url && (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-16 h-16 rounded-lg object-cover border border-border/50 shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm text-foreground">{product.name}</p>
                      {/* Real-time toggle */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] text-muted-foreground">{product.is_active ? 'مفعّل' : 'معطّل'}</span>
                        <Switch
                          checked={product.is_active}
                          onCheckedChange={() => toggleActive(product)}
                          className="scale-75"
                        />
                      </div>
                    </div>
                    {/* Show options summary */}
                    {product.options && product.options.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {product.options.map((opt, i) => (
                          <Badge key={i} variant="outline" className="text-[10px]">
                            {opt.label} ({opt.values.length})
                          </Badge>
                        ))}
                      </div>
                    )}
                    {/* Show defaults summary */}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {DROPDOWN_FIELDS.map(field => {
                        const name = getMasterName(field.table, (product as any)[field.key]);
                        return name ? (
                          <Badge key={field.key} variant="secondary" className="text-[10px]">
                            {field.label}: {name}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(product)} className="h-7 px-2 text-xs gap-1">
                        <Pencil className="h-3 w-3" />
                        تعديل
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => duplicateProduct(product)} className="h-7 px-2 text-xs gap-1">
                        <Copy className="h-3 w-3" />
                        تكرار
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(product.id)} className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive">
                        <Trash2 className="h-3 w-3" />
                        حذف
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingProduct ? `تعديل: ${editingProduct.name}` : 'إضافة منتج جديد'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 mt-2">
            {/* ===== 1. Basic Info ===== */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">اسم المنتج *</label>
                <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="مثال: عباية تخرج كلاسيك" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">صورة المنتج</label>
                {formImagePreview ? (
                  <div className="relative w-full h-20 rounded-lg overflow-hidden border border-border">
                    <img src={formImagePreview} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => { setFormImage(null); setFormImagePreview(''); }}
                      className="absolute top-1 left-1 bg-background/80 rounded-full p-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 h-20 rounded-lg border-2 border-dashed border-border cursor-pointer hover:bg-muted/30 transition-colors">
                    <ImagePlus className="h-5 w-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">اختر صورة</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                  </label>
                )}
              </div>
            </div>

            <Separator />

            {/* ===== 2. Kit-like Default Fields ===== */}
            <div>
              <h3 className="text-sm font-bold text-foreground border-b border-border pb-1 mb-3">العناصر الأساسية (مطابقة للأطقم الجاهزة)</h3>
              <div className="grid grid-cols-2 gap-3">
                {DROPDOWN_FIELDS.map(field => (
                  <div key={field.key}>
                    <label className="text-xs font-medium mb-1 block">{field.label}</label>
                    <Select
                      value={formDefaults[field.key as keyof typeof formDefaults] || '_none_'}
                      onValueChange={v => setFormDefaults(prev => ({ ...prev, [field.key]: v === '_none_' ? '' : v }))}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="اختر" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none_">-- بدون --</SelectItem>
                        {(masterData[field.table] || []).map(item => (
                          <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                {/* Embroidery color - special dropdown like Kits */}
                <div>
                  <label className="text-xs font-medium mb-1 block">لون التطريز</label>
                  <Select
                    value={formDefaults.embroidery_color || '_none_'}
                    onValueChange={v => setFormDefaults(prev => ({ ...prev, embroidery_color: v === '_none_' ? '' : v }))}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="اختر" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none_">-- بدون --</SelectItem>
                      {EMBROIDERY_COLORS.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* ===== 3. Colors ===== */}
            <div>
              <h3 className="text-sm font-bold text-foreground border-b border-border pb-1 mb-3">الألوان</h3>
              <div className="grid grid-cols-2 gap-3">
                {COLOR_FIELDS.map(field => (
                  <div key={field.key}>
                    <label className="text-xs font-medium mb-1 block">{field.label}</label>
                    <Input
                      value={formDefaults[field.key as keyof typeof formDefaults] || ''}
                      onChange={e => setFormDefaults(prev => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.label}
                      className="h-9 text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* ===== 4. Dynamic Properties (Separate Boxes) ===== */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">خصائص إضافية</h3>
                <Button type="button" variant="outline" size="sm" onClick={addOption} className="gap-1">
                  <Plus className="h-3 w-3" />
                  إضافة خاصية جديدة
                </Button>
              </div>

              {formOptions.map((opt, index) => (
                <Card key={index} className="border-border/50 bg-muted/20">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-muted-foreground">خاصية {index + 1}</span>
                      <Button variant="ghost" size="icon" onClick={() => removeOption(index)} className="h-7 w-7 text-destructive hover:text-destructive">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Property name */}
                    <div>
                      <label className="text-xs font-medium mb-1 block">اسم الخاصية</label>
                      <Input
                        value={opt.label}
                        onChange={e => updateOption(index, { label: e.target.value })}
                        placeholder="مثال: المقاس"
                        className="text-sm"
                      />
                    </div>

                    {/* Values as tags - each value added individually */}
                    <div>
                      <label className="text-xs font-medium mb-1 block">القيم</label>
                      <TagInput
                        values={opt.values}
                        onAdd={(val) => addValueToOption(index, val)}
                        onRemove={(valIdx) => removeValueFromOption(index, valIdx)}
                        placeholder="اكتب قيمة ثم اضغط Enter"
                      />
                    </div>

                    {/* Required toggle */}
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={opt.is_required}
                        onCheckedChange={v => updateOption(index, { is_required: !!v })}
                      />
                      <span className="text-xs text-muted-foreground">خاصية إجبارية</span>
                    </div>

                    {/* Default value */}
                    <div>
                      <label className="text-xs font-medium mb-1 block">القيمة الافتراضية</label>
                      {opt.values.length > 0 ? (
                        <Select
                          value={opt.default_value || '_none_'}
                          onValueChange={v => updateOption(index, { default_value: v === '_none_' ? '' : v })}
                        >
                          <SelectTrigger className="text-sm">
                            <SelectValue placeholder="اختر القيمة الافتراضية" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none_">-- بدون --</SelectItem>
                            {opt.values.map((val, vi) => (
                              <SelectItem key={vi} value={val}>{val}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={opt.default_value}
                          onChange={e => updateOption(index, { default_value: e.target.value })}
                          placeholder="القيمة الافتراضية (اختياري)"
                          className="text-sm"
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {formOptions.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3 border border-dashed border-border rounded-lg">
                  لم تتم إضافة خصائص إضافية بعد
                </p>
              )}
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full gap-1">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {saving ? 'جارٍ الحفظ...' : editingProduct ? 'حفظ التعديلات' : 'إضافة المنتج'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ===== Tag Input Component =====
function TagInput({ values, onAdd, onRemove, placeholder }: {
  values: string[];
  onAdd: (val: string) => void;
  onRemove: (index: number) => void;
  placeholder: string;
}) {
  const [inputVal, setInputVal] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputVal.trim()) {
        onAdd(inputVal.trim());
        setInputVal('');
      }
    }
  };

  const handleAdd = () => {
    if (inputVal.trim()) {
      onAdd(inputVal.trim());
      setInputVal('');
    }
  };

  return (
    <div className="space-y-2">
      {/* Existing values as tags */}
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((val, i) => (
            <Badge key={i} variant="secondary" className="text-xs gap-1 px-2 py-1">
              {val}
              <button onClick={() => onRemove(i)} className="hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      {/* Input for new value */}
      <div className="flex gap-2">
        <Input
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="text-sm flex-1"
        />
        <Button type="button" variant="outline" size="sm" onClick={handleAdd} disabled={!inputVal.trim()} className="shrink-0">
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
