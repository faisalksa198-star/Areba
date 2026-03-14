import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Plus, Pencil, Trash2, Loader2, ImagePlus, X, ArrowRight, ArrowUp, ArrowDown,
  Palette, Scissors, Wind, Type, MapPin, Compass, Calendar, Crown, Sparkles, DollarSign, Tag,
} from 'lucide-react';
import PricingRulesTab from '@/components/PricingRulesTab';
import AddonPricesTab from '@/components/AddonPricesTab';
import SeasonSettings from '@/pages/SeasonSettings';

interface MasterItem {
  id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  is_active: boolean;
  has_extra_text?: boolean | null;
}

const CATEGORIES = [
  { key: 'abaya_designs', label: 'تصاميم العبايات', icon: Crown, hasImage: true, hasDescription: true },
  { key: 'sleeve_styles', label: 'أطراف الكم', icon: Scissors, hasImage: true, hasDescription: false },
  { key: 'scarf_styles', label: 'أشكال الأوشحة', icon: Wind, hasImage: true, hasDescription: false },
  { key: 'scarf_methods', label: 'أطراف الوشاح', icon: Wind, hasImage: true, hasDescription: false },
  { key: 'embroidery_directions', label: 'اتجاه التطريز', icon: Compass, hasImage: true, hasDescription: false },
  { key: 'fonts', label: 'الخطوط', icon: Type, hasImage: false, hasDescription: false },
  { key: 'date_types', label: 'أنواع التواريخ', icon: Calendar, hasImage: true, hasDescription: false },
  { key: 'hat_styles', label: 'أشكال القبعات', icon: Palette, hasImage: true, hasDescription: false },
  { key: 'hat_embroideries', label: 'تطريز القبعات', icon: Sparkles, hasImage: true, hasDescription: false },
  { key: 'cities', label: 'المدن', icon: MapPin, hasImage: false, hasDescription: false },
  { key: 'pricing_rules', label: 'التسعيرة', icon: DollarSign, hasImage: false, hasDescription: false },
  { key: 'addon_prices', label: 'أسعار الإضافات', icon: Tag, hasImage: false, hasDescription: false },
  { key: 'season_settings', label: 'إعدادات المواسم', icon: Calendar, hasImage: false, hasDescription: false },
] as const;

type CategoryKey = typeof CATEGORIES[number]['key'];

export default function DataCenter() {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<CategoryKey | null>(null);
  const [items, setItems] = useState<MasterItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterItem | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formImage, setFormImage] = useState<File | null>(null);
  const [formImagePreview, setFormImagePreview] = useState('');
  const [formHasExtraText, setFormHasExtraText] = useState(false);
  const [saving, setSaving] = useState(false);

  const activeCat = CATEGORIES.find(c => c.key === activeSection);

  const loadItems = useCallback(async () => {
    if (!activeSection || activeSection === 'pricing_rules' || activeSection === 'addon_prices' || activeSection === 'season_settings') return;
    setLoading(true);
    const { data } = await supabase
      .from(activeSection)
      .select('*')
      .order('sort_order', { ascending: true });
    setItems((data as unknown as MasterItem[]) || []);
    setLoading(false);
  }, [activeSection]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const openCreate = () => {
    setEditingItem(null);
    setFormName('');
    setFormDescription('');
    setFormImage(null);
    setFormImagePreview('');
    setFormHasExtraText(false);
    setShowForm(true);
  };

  const openEdit = (item: MasterItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormDescription(item.description || '');
    setFormImage(null);
    setFormImagePreview(item.image_url || '');
    setFormHasExtraText(!!item.has_extra_text);
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
    const path = `${activeSection}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('images').upload(path, file);
    if (error) {
      toast({ title: 'خطأ في رفع الصورة', description: error.message, variant: 'destructive' });
      return null;
    }
    const { data } = supabase.storage.from('images').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSave = async () => {
    if (!activeSection || !activeCat) return;
    if (!formName.trim()) {
      toast({ title: activeSection === 'hat_embroideries' ? 'يرجى إدخال رقم التطريز' : 'يرجى إدخال الاسم', variant: 'destructive' });
      return;
    }
    setSaving(true);

    let imageUrl = editingItem?.image_url || null;
    if (formImage) {
      imageUrl = await uploadImage(formImage);
      if (imageUrl === null && formImage) {
        setSaving(false);
        return;
      }
    }

    const record: any = { name: formName.trim() };
    if (activeCat.hasImage) record.image_url = imageUrl;
    if (activeCat.hasDescription) record.description = formDescription.trim() || null;
    if (activeSection === 'hat_embroideries') record.has_extra_text = formHasExtraText;

    let error;
    if (editingItem) {
      ({ error } = await supabase.from(activeSection as any).update(record).eq('id', editingItem.id));
    } else {
      ({ error } = await supabase.from(activeSection as any).insert(record));
    }

    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: editingItem ? 'تم التعديل ✓' : 'تمت الإضافة ✓' });
      setShowForm(false);
      loadItems();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!activeSection) return;
    const { error } = await supabase.from(activeSection as any).delete().eq('id', id);
    if (error) {
      toast({ title: 'خطأ في الحذف', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم الحذف ✓' });
      loadItems();
    }
  };

  const toggleActive = async (item: MasterItem) => {
    if (!activeSection) return;
    await supabase.from(activeSection as any).update({ is_active: !item.is_active }).eq('id', item.id);
    loadItems();
  };

  const moveSortOrder = async (item: MasterItem, direction: 'up' | 'down') => {
    if (!activeSection) return;
    const idx = items.findIndex(i => i.id === item.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= items.length) return;
    const other = items[swapIdx];
    // Swap sort_order values
    const itemOrder = (item as any).sort_order ?? idx;
    const otherOrder = (other as any).sort_order ?? swapIdx;
    await Promise.all([
      supabase.from(activeSection as any).update({ sort_order: otherOrder } as any).eq('id', item.id),
      supabase.from(activeSection as any).update({ sort_order: itemOrder } as any).eq('id', other.id),
    ]);
    loadItems();
  };

  // Grid view (no active section selected)
  if (!activeSection) {
    return (
      <DashboardLayout>
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-foreground">مركز البيانات</h1>
            <p className="text-muted-foreground text-sm mt-1">إدارة البيانات الأساسية للنظام</p>
          </div>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" dir="rtl">
            {CATEGORIES.map(cat => (
              <Card
                key={cat.key}
                className="cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all"
                onClick={() => setActiveSection(cat.key)}
              >
                <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <cat.icon className="h-6 w-6 text-primary" />
                  </div>
                  <p className="font-semibold text-sm text-foreground">{cat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Detail view for a specific section
  return (
    <DashboardLayout>
      <div className="space-y-5" dir="rtl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setActiveSection(null)} className="gap-1">
            <ArrowRight className="h-4 w-4" />
            رجوع
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{activeCat?.label}</h1>
          </div>
        </div>

        {activeSection === 'pricing_rules' ? (
          <PricingRulesTab />
        ) : activeSection === 'addon_prices' ? (
          <AddonPricesTab />
        ) : activeSection === 'season_settings' ? (
          <SeasonSettingsInline />
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div />
              <Button size="sm" onClick={openCreate} className="gap-1">
                <Plus className="h-3.5 w-3.5" />
                إضافة
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : items.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  {activeCat && <activeCat.icon className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />}
                  <p className="text-muted-foreground text-sm">لا توجد عناصر بعد</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {items.map(item => (
                  <Card key={item.id} className={`border-border/50 transition-opacity ${!item.is_active ? 'opacity-50' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {activeCat?.hasImage && item.image_url && (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-14 h-14 rounded-lg object-cover border border-border/50 shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-sm text-foreground">{item.name}</p>
                              {activeSection === 'hat_embroideries' && item.has_extra_text && (
                                <Badge variant="outline" className="mt-1 text-[10px]">يحتاج نص إضافي</Badge>
                              )}
                              {(item as any).description && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                  {(item as any).description}
                                </p>
                              )}
                            </div>
                            <Badge
                              variant={item.is_active ? 'secondary' : 'outline'}
                              className="cursor-pointer text-[10px] shrink-0"
                              onClick={() => toggleActive(item)}
                            >
                              {item.is_active ? 'مفعّل' : 'معطّل'}
                            </Badge>
                          </div>
                          <div className="flex gap-1 mt-2">
                            <Button variant="ghost" size="icon" onClick={() => moveSortOrder(item, 'up')} className="h-7 w-7" disabled={items.indexOf(item) === 0}>
                              <ArrowUp className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => moveSortOrder(item, 'down')} className="h-7 w-7" disabled={items.indexOf(item) === items.length - 1}>
                              <ArrowDown className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => openEdit(item)} className="h-7 px-2 text-xs gap-1">
                              <Pencil className="h-3 w-3" />
                              تعديل
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive">
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
          </>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingItem ? `تعديل: ${editingItem.name}` : `إضافة ${activeCat?.label}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                {activeSection === 'hat_embroideries' ? 'رقم التطريز *' : 'الاسم *'}
              </label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder={activeSection === 'hat_embroideries' ? 'مثال: 12' : 'أدخل الاسم'} />
            </div>

            {activeSection === 'hat_embroideries' && (
              <div className="flex items-center gap-2">
                <Checkbox checked={formHasExtraText} onCheckedChange={v => setFormHasExtraText(!!v)} />
                <span className="text-sm text-foreground">نص إضافي</span>
              </div>
            )}

            {activeCat?.hasDescription && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">الوصف</label>
                <Input value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="وصف مختصر (اختياري)" />
              </div>
            )}

            {activeCat?.hasImage && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">الصورة</label>
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
            )}

            <Button onClick={handleSave} disabled={saving} className="w-full gap-1">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {saving ? 'جارٍ الحفظ...' : editingItem ? 'حفظ التعديلات' : 'إضافة'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
