import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Plus, Pencil, Trash2, Loader2, ImagePlus, X, Search, Archive, ArchiveRestore, Copy,
} from 'lucide-react';

// Master data source tables that options can link to
const SOURCE_TABLES = [
  { key: 'abaya_designs', label: 'تصاميم العبايات' },
  { key: 'sleeve_styles', label: 'أطراف الكم' },
  { key: 'scarf_styles', label: 'أشكال الأوشحة' },
  { key: 'scarf_methods', label: 'أطراف الوشاح' },
  { key: 'embroidery_directions', label: 'اتجاه التطريز' },
  { key: 'fonts', label: 'الخطوط' },
  { key: 'date_types', label: 'أنواع التواريخ' },
  { key: 'hat_styles', label: 'أشكال القبعات' },
  { key: 'hat_embroideries', label: 'تطريز القبعات' },
  { key: 'cities', label: 'المدن' },
] as const;

interface MasterDataItem {
  id: string;
  name: string;
  is_active: boolean;
}

interface ProductOption {
  id?: string;
  label: string;
  values: string[];
  is_required: boolean;
  default_value: string;
  sort_order: number;
  source_table?: string | null;
}

interface SallaProduct {
  id: string;
  name: string;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  options?: ProductOption[];
  // Ready-kit-like defaults
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

  // Master data cache
  const [masterData, setMasterData] = useState<Record<string, MasterDataItem[]>>({});

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<SallaProduct | null>(null);
  const [formName, setFormName] = useState('');
  const [formImage, setFormImage] = useState<File | null>(null);
  const [formImagePreview, setFormImagePreview] = useState('');
  const [formOptions, setFormOptions] = useState<ProductOption[]>([]);
  const [saving, setSaving] = useState(false);

  // Ready-kit-like default fields
  const [formDefaults, setFormDefaults] = useState({
    abaya_design_id: '' as string,
    sleeve_style_id: '' as string,
    scarf_style_id: '' as string,
    scarf_method_id: '' as string,
    hat_style_id: '' as string,
    font_id: '' as string,
    date_type_id: '' as string,
    embroidery_direction_id: '' as string,
    embroidery_color: '' as string,
    abaya_color: '' as string,
    abaya_color_degree: '' as string,
    scarf_color: '' as string,
    scarf_color_degree: '' as string,
    hat_color: '' as string,
    hat_color_degree: '' as string,
    sleeve_color: '' as string,
  });

  // Load all master data for dropdowns
  const loadMasterData = useCallback(async () => {
    const tables = SOURCE_TABLES.map(t => t.key);
    const results = await Promise.all(
      tables.map(table =>
        supabase.from(table).select('id, name, is_active').eq('is_active', true).order('sort_order', { ascending: true })
      )
    );
    const data: Record<string, MasterDataItem[]> = {};
    tables.forEach((table, i) => {
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
          source_table: o.source_table || null,
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
        source_table: o.source_table,
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
      source_table: null,
    }]);
  };

  const updateOption = (index: number, updates: Partial<ProductOption>) => {
    setFormOptions(prev => prev.map((opt, i) => {
      if (i !== index) return opt;
      const updated = { ...opt, ...updates };
      // If source_table changed, clear manual values
      if (updates.source_table !== undefined) {
        if (updates.source_table) {
          updated.values = [];
        }
      }
      return updated;
    }));
  };

  const removeOption = (index: number) => {
    setFormOptions(prev => prev.filter((_, i) => i !== index));
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
        values: o.source_table ? [] : o.values,
        is_required: o.is_required,
        default_value: o.default_value || null,
        sort_order: i,
        source_table: o.source_table || null,
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

  const toggleArchive = async (product: SallaProduct) => {
    const newStatus = !product.is_active;
    // Optimistic update
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_active: newStatus } : p));
    const { error } = await supabase.from('salla_products').update({ is_active: newStatus }).eq('id', product.id);
    if (error) {
      // Revert on error
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_active: !newStatus } : p));
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: newStatus ? 'تم التفعيل ✓' : 'تمت الأرشفة ✓' });
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

  // Helper to get master data item name by id
  const getMasterName = (table: string, id: string | null) => {
    if (!id || !masterData[table]) return null;
    return masterData[table].find(i => i.id === id)?.name || null;
  };

  // Get values for an option (from source_table or manual)
  const getOptionValues = (opt: ProductOption): string[] => {
    if (opt.source_table && masterData[opt.source_table]) {
      return masterData[opt.source_table].map(item => item.name);
    }
    return opt.values;
  };

  const DROPDOWN_FIELDS = [
    { key: 'abaya_design_id', label: 'تصميم العباية', table: 'abaya_designs' },
    { key: 'sleeve_style_id', label: 'طرف الكم', table: 'sleeve_styles' },
    { key: 'scarf_style_id', label: 'شكل الوشاح', table: 'scarf_styles' },
    { key: 'scarf_method_id', label: 'طرف الوشاح', table: 'scarf_methods' },
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
    { key: 'embroidery_color', label: 'لون التطريز' },
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
          <Archive className="h-3.5 w-3.5" />
          {showArchived ? 'عرض النشطة' : 'عرض المؤرشفة'}
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
              {showArchived ? 'لا توجد منتجات مؤرشفة' : 'لا توجد منتجات بعد'}
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
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm text-foreground">{product.name}</p>
                      <Badge variant={product.is_active ? 'secondary' : 'outline'} className="text-[10px] shrink-0">
                        {product.is_active ? 'نشط' : 'مؤرشف'}
                      </Badge>
                    </div>
                    {/* Show linked master data summary */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {product.options && product.options.length > 0 && product.options.map((opt, i) => (
                        <Badge key={i} variant="outline" className="text-[10px]">
                          {opt.label} ({opt.source_table ? getMasterName(opt.source_table, '') ? 'مرتبط' : 'ديناميكي' : opt.values.length})
                        </Badge>
                      ))}
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
                      <Button variant="ghost" size="sm" onClick={() => toggleArchive(product)} className="h-7 px-2 text-xs gap-1">
                        {product.is_active ? <Archive className="h-3 w-3" /> : <ArchiveRestore className="h-3 w-3" />}
                        {product.is_active ? 'أرشفة' : 'تفعيل'}
                      </Button>
                      {!product.is_active && (
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(product.id)} className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive">
                          <Trash2 className="h-3 w-3" />
                          حذف
                        </Button>
                      )}
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
            {/* Basic info */}
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

            {/* Default master data selections */}
            <div>
              <label className="text-sm font-medium mb-3 block">القيم الافتراضية للمنتج (من البيانات الأساسية)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {DROPDOWN_FIELDS.map(field => (
                  <div key={field.key}>
                    <label className="text-xs text-muted-foreground mb-1 block">{field.label}</label>
                    <Select
                      value={formDefaults[field.key] || '_none_'}
                      onValueChange={v => setFormDefaults(prev => ({ ...prev, [field.key]: v === '_none_' ? '' : v }))}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="اختر..." />
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
              </div>
            </div>

            {/* Color fields */}
            <div>
              <label className="text-sm font-medium mb-3 block">الألوان الافتراضية</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {COLOR_FIELDS.map(field => (
                  <div key={field.key}>
                    <label className="text-xs text-muted-foreground mb-1 block">{field.label}</label>
                    <Input
                      value={formDefaults[field.key] || ''}
                      onChange={e => setFormDefaults(prev => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.label}
                      className="text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Dynamic options */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">خصائص إضافية (ديناميكية)</label>
                <Button type="button" variant="outline" size="sm" onClick={addOption} className="gap-1">
                  <Plus className="h-3 w-3" />
                  إضافة خاصية
                </Button>
              </div>

              {formOptions.map((opt, index) => (
                <Card key={index} className="border-border/50">
                  <CardContent className="p-3 space-y-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-2">
                        <Input
                          value={opt.label}
                          onChange={e => updateOption(index, { label: e.target.value })}
                          placeholder="اسم الخاصية (مثال: المقاس)"
                          className="text-sm"
                        />

                        {/* Source: linked to master data OR manual */}
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">مصدر القيم</label>
                          <Select
                            value={opt.source_table || '_manual_'}
                            onValueChange={v => updateOption(index, { source_table: v === '_manual_' ? null : v })}
                          >
                            <SelectTrigger className="text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="_manual_">إدخال يدوي</SelectItem>
                              {SOURCE_TABLES.map(st => (
                                <SelectItem key={st.key} value={st.key}>{st.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Manual values input (only when no source_table) */}
                        {!opt.source_table && (
                          <Input
                            value={opt.values.join(' - ')}
                            onChange={e => updateOption(index, {
                              values: e.target.value.split('-').map(v => v.trim()).filter(Boolean)
                            })}
                            placeholder="القيم مفصولة بشرطة - (مثال: 48 - 50 - 52 - 54)"
                            className="text-sm"
                          />
                        )}

                        {/* Show linked values preview */}
                        {opt.source_table && masterData[opt.source_table] && (
                          <div className="flex flex-wrap gap-1">
                            {masterData[opt.source_table].map(item => (
                              <Badge key={item.id} variant="outline" className="text-[10px]">{item.name}</Badge>
                            ))}
                          </div>
                        )}

                        {/* Default value */}
                        {opt.source_table ? (
                          <Select
                            value={opt.default_value || '_none_'}
                            onValueChange={v => updateOption(index, { default_value: v === '_none_' ? '' : v })}
                          >
                            <SelectTrigger className="text-sm">
                              <SelectValue placeholder="القيمة الافتراضية (اختياري)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="_none_">-- بدون --</SelectItem>
                              {(masterData[opt.source_table] || []).map(item => (
                                <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>
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

                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={opt.is_required}
                            onCheckedChange={v => updateOption(index, { is_required: !!v })}
                          />
                          <span className="text-xs text-muted-foreground">خاصية إجبارية</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeOption(index)} className="h-8 w-8 text-destructive hover:text-destructive shrink-0">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {formOptions.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">لم تتم إضافة خصائص ديناميكية بعد</p>
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
