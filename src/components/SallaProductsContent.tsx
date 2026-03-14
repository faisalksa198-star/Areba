import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Plus, Pencil, Trash2, Loader2, ImagePlus, X, Search, Archive, ArchiveRestore, Copy,
} from 'lucide-react';

interface ProductOption {
  id?: string;
  label: string;
  values: string[];
  is_required: boolean;
  default_value: string;
  sort_order: number;
}

interface SallaProduct {
  id: string;
  name: string;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  options?: ProductOption[];
}

export default function SallaProductsContent() {
  const { toast } = useToast();
  const [products, setProducts] = useState<SallaProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<SallaProduct | null>(null);
  const [formName, setFormName] = useState('');
  const [formImage, setFormImage] = useState<File | null>(null);
  const [formImagePreview, setFormImagePreview] = useState('');
  const [formOptions, setFormOptions] = useState<ProductOption[]>([]);
  const [saving, setSaving] = useState(false);

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
        })),
      }));
      setProducts(productsWithOptions);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const filtered = products.filter(p => {
    const matchesSearch = !search || p.name.includes(search);
    const matchesArchive = showArchived ? !p.is_active : p.is_active;
    return matchesSearch && matchesArchive;
  });

  const openCreate = () => {
    setEditingProduct(null);
    setFormName('');
    setFormImage(null);
    setFormImagePreview('');
    setFormOptions([]);
    setShowForm(true);
  };

  const openEdit = (product: SallaProduct) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormImage(null);
    setFormImagePreview(product.image_url || '');
    setFormOptions(product.options || []);
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
      }))
    );
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
    }]);
  };

  const updateOption = (index: number, updates: Partial<ProductOption>) => {
    setFormOptions(prev => prev.map((opt, i) => i === index ? { ...opt, ...updates } : opt));
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

    let productId: string;

    if (editingProduct) {
      const { error } = await supabase
        .from('salla_products')
        .update({ name: formName.trim(), image_url: imageUrl })
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
        .insert({ name: formName.trim(), image_url: imageUrl })
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
        values: o.values,
        is_required: o.is_required,
        default_value: o.default_value || null,
        sort_order: i,
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
    const { error } = await supabase.from('salla_products').update({ is_active: !product.is_active }).eq('id', product.id);
    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: product.is_active ? 'تمت الأرشفة ✓' : 'تم التفعيل ✓' });
    loadProducts();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('salla_products').delete().eq('id', id);
    if (error) {
      toast({ title: 'خطأ في الحذف', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم الحذف ✓' });
      loadProducts();
    }
  };

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
                    {product.options && product.options.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {product.options.map((opt, i) => (
                          <Badge key={i} variant="outline" className="text-[10px]">
                            {opt.label} ({opt.values.length})
                          </Badge>
                        ))}
                      </div>
                    )}
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
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingProduct ? `تعديل: ${editingProduct.name}` : 'إضافة منتج جديد'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 mt-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">اسم المنتج *</label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="مثال: عباية تخرج كلاسيك" />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">صورة المنتج</label>
              {formImagePreview ? (
                <div className="relative w-full h-32 rounded-lg overflow-hidden border border-border">
                  <img src={formImagePreview} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => { setFormImage(null); setFormImagePreview(''); }}
                    className="absolute top-1 left-1 bg-background/80 rounded-full p-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 h-28 rounded-lg border-2 border-dashed border-border cursor-pointer hover:bg-muted/30 transition-colors">
                  <ImagePlus className="h-6 w-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">اختر صورة</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                </label>
              )}
            </div>

            {/* Dynamic options */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">خصائص المنتج</label>
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
                        <Input
                          value={opt.values.join('-')}
                          onChange={e => updateOption(index, { values: e.target.value.split('-').map(v => v.trim()).filter(Boolean) })}
                          placeholder="القيم مفصولة بشرطات (مثال: 50-52-54)"
                          className="text-sm"
                        />
                        <Input
                          value={opt.default_value}
                          onChange={e => updateOption(index, { default_value: e.target.value })}
                          placeholder="القيمة الافتراضية (اختياري)"
                          className="text-sm"
                        />
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
                <p className="text-xs text-muted-foreground text-center py-3">لم تتم إضافة خصائص بعد</p>
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
