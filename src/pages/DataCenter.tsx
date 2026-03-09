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
  Plus, Pencil, Trash2, Loader2, ImagePlus, X,
  Palette, Scissors, Wind, Type, MapPin, Compass, Calendar, Crown, Sparkles,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  { key: 'scarf_methods', label: 'طرق الوشاح', icon: Wind, hasImage: true, hasDescription: false },
  { key: 'embroidery_directions', label: 'اتجاه التطريز', icon: Compass, hasImage: true, hasDescription: false },
  { key: 'fonts', label: 'الخطوط', icon: Type, hasImage: false, hasDescription: false },
  { key: 'date_types', label: 'أنواع التواريخ', icon: Calendar, hasImage: true, hasDescription: false },
  { key: 'hat_styles', label: 'أشكال القبعات', icon: Palette, hasImage: true, hasDescription: false },
  { key: 'hat_embroideries', label: 'تطريز القبعات', icon: Sparkles, hasImage: true, hasDescription: false },
  { key: 'cities', label: 'المدن', icon: MapPin, hasImage: false, hasDescription: false },
] as const;

type CategoryKey = typeof CATEGORIES[number]['key'];

export default function DataCenter() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<CategoryKey>('abaya_designs');
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

  const activeCat = CATEGORIES.find(c => c.key === activeTab)!;

  const loadItems = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from(activeTab)
      .select('*')
      .order('created_at', { ascending: false });
    setItems((data as unknown as MasterItem[]) || []);
    setLoading(false);
  }, [activeTab]);

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
    const path = `${activeTab}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('images').upload(path, file);
    if (error) {
      toast({ title: 'خطأ في رفع الصورة', description: error.message, variant: 'destructive' });
      return null;
    }
    const { data } = supabase.storage.from('images').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast({ title: activeTab === 'hat_embroideries' ? 'يرجى إدخال رقم التطريز' : 'يرجى إدخال الاسم', variant: 'destructive' });
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
    if (activeTab === 'hat_embroideries') record.has_extra_text = formHasExtraText;

    let error;
    if (editingItem) {
      ({ error } = await supabase.from(activeTab as any).update(record).eq('id', editingItem.id));
    } else {
      ({ error } = await supabase.from(activeTab as any).insert(record));
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
    const { error } = await supabase.from(activeTab as any).delete().eq('id', id);
    if (error) {
      toast({ title: 'خطأ في الحذف', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم الحذف ✓' });
      loadItems();
    }
  };

  const toggleActive = async (item: MasterItem) => {
    await supabase.from(activeTab as any).update({ is_active: !item.is_active }).eq('id', item.id);
    loadItems();
  };

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">مركز البيانات</h1>
            <p className="text-muted-foreground text-sm mt-1">إدارة البيانات الأساسية للنظام</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as CategoryKey)} dir="rtl">
          <div className="overflow-x-auto -mx-1 px-1">
            <TabsList className="inline-flex h-auto gap-1 bg-muted/50 p-1 rounded-xl flex-nowrap">
              {CATEGORIES.map(cat => (
                <TabsTrigger
                  key={cat.key}
                  value={cat.key}
                  className="gap-1.5 text-xs px-3 py-2 whitespace-nowrap rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm"
                >
                  <cat.icon className="h-3.5 w-3.5" />
                  {cat.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {CATEGORIES.map(cat => (
            <TabsContent key={cat.key} value={cat.key} className="mt-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">{cat.label}</h2>
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
                    <cat.icon className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-muted-foreground text-sm">لا توجد عناصر بعد</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map(item => (
                    <Card key={item.id} className={`border-border/50 transition-opacity ${!item.is_active ? 'opacity-50' : ''}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {cat.hasImage && item.image_url && (
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
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingItem ? `تعديل: ${editingItem.name}` : `إضافة ${activeCat.label}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">الاسم *</label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="أدخل الاسم" />
            </div>

            {activeCat.hasDescription && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">الوصف</label>
                <Input value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="وصف مختصر (اختياري)" />
              </div>
            )}

            {activeCat.hasImage && (
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
