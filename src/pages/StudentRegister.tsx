import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { Save, Loader2, School, ChevronDown } from 'lucide-react';

const SIZES = ['48', '50', '52', '54', '56', '58', '60', '62', '64'];

interface ScarfDesign {
  id: string;
  sort_order: number;
  scarf_style_name?: string;
  date_type_name?: string;
  scarf_method_name?: string;
  embroidery_direction_name?: string;
  font_name?: string;
  embroidery_color?: string;
}

interface HatEmbroideryOption {
  id: string;
  name: string;
  has_extra_text: boolean;
  image_url?: string | null;
}

interface OrderInfo {
  student_count: number;
  logo_embroidery_enabled: boolean;
  logo_embroidery_count: number;
  back_embroidery_enabled: boolean;
  back_embroidery_count: number;
  hat_embroidery_enabled: boolean;
  hat_embroidery_count: number;
}

export default function StudentRegister() {
  const { orderId } = useParams<{ orderId: string }>();
  const { toast } = useToast();
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
  const [scarfDesigns, setScarfDesigns] = useState<ScarfDesign[]>([]);
  const [hatEmbroideries, setHatEmbroideries] = useState<HatEmbroideryOption[]>([]);
  const [noEmbroideryId, setNoEmbroideryId] = useState('');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [size, setSize] = useState('');
  const [scarfDesignId, setScarfDesignId] = useState('');
  const [hatEmbroideryId, setHatEmbroideryId] = useState('');
  const [hatExtraText, setHatExtraText] = useState('');
  const [hasLogoEmbroidery, setHasLogoEmbroidery] = useState(false);
  const [backEmbroideryText, setBackEmbroideryText] = useState('');

  // Counts
  const [existingCount, setExistingCount] = useState(0);
  const [existingLogoCount, setExistingLogoCount] = useState(0);
  const [existingBackCount, setExistingBackCount] = useState(0);
  const [existingHatCount, setExistingHatCount] = useState(0);

  useEffect(() => {
    if (!orderId) return;
    loadData();
  }, [orderId]);

  const loadData = async () => {
    const [orderRes, countRes] = await Promise.all([
      supabase
        .from('orders')
        .select('student_count, logo_embroidery_enabled, logo_embroidery_count, back_embroidery_enabled, back_embroidery_count, hat_embroidery_enabled, hat_embroidery_count, status, data_submitted')
        .eq('id', orderId!)
        .maybeSingle(),
      supabase.from('students').select('has_logo_embroidery, back_embroidery_text, hat_embroidery_id').eq('order_id', orderId!),
    ]);

    if (!orderRes.data) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const o = orderRes.data as any;
    const info: OrderInfo = {
      student_count: o.student_count || 30,
      logo_embroidery_enabled: o.logo_embroidery_enabled || false,
      logo_embroidery_count: o.logo_embroidery_count || 0,
      back_embroidery_enabled: o.back_embroidery_enabled || false,
      back_embroidery_count: o.back_embroidery_count || 0,
      hat_embroidery_enabled: o.hat_embroidery_enabled || false,
      hat_embroidery_count: o.hat_embroidery_count || 0,
    };
    setOrderInfo(info);

    const studentsData = countRes.data || [];
    setExistingCount(studentsData.length);
    setExistingLogoCount(studentsData.filter((s: any) => s.has_logo_embroidery).length);
    setExistingBackCount(studentsData.filter((s: any) => s.back_embroidery_text?.trim()).length);
    setExistingHatCount(studentsData.filter((s: any) => s.hat_embroidery_id).length);

    // Logo is "all" → auto-enable
    const logoIsAll = info.logo_embroidery_enabled && (info.logo_embroidery_count === 0 || info.logo_embroidery_count >= info.student_count);
    if (logoIsAll) setHasLogoEmbroidery(true);

    // Load hat embroideries + scarf designs
    const [hatsRes, scarfsRes] = await Promise.all([
      supabase.from('hat_embroideries').select('id, name, image_url, has_extra_text').eq('is_active', true).order('created_at'),
      supabase
        .from('order_scarf_designs')
        .select(`
          id, sort_order, embroidery_color,
          scarf_styles!scarf_style_id(name, image_url),
          date_types!date_type_id(name, image_url),
          scarf_methods!scarf_method_id(name),
          embroidery_directions!embroidery_direction_id(name),
          fonts!font_id(name)
        `)
        .eq('order_id', orderId!)
        .order('sort_order'),
    ]);

    // Hat embroideries
    const hatsSorted = ((hatsRes.data as any[]) || [])
      .sort((a: any, b: any) => {
        if (a.name === 'بدون تطريز') return -1;
        if (b.name === 'بدون تطريز') return 1;
        return String(a.name).localeCompare(String(b.name), 'ar');
      }) as HatEmbroideryOption[];
    setHatEmbroideries(hatsSorted);
    const noneId = hatsSorted.find(h => h.name === 'بدون تطريز')?.id || '';
    setNoEmbroideryId(noneId);
    if (noneId) setHatEmbroideryId(noneId);

    // Scarf designs
    const parsed: ScarfDesign[] = ((scarfsRes.data as any[]) || []).map((s: any) => ({
      id: s.id,
      sort_order: s.sort_order,
      scarf_style_name: s.scarf_styles?.name,
      date_type_name: s.date_types?.name,
      scarf_method_name: s.scarf_methods?.name,
      embroidery_direction_name: s.embroidery_directions?.name,
      font_name: s.fonts?.name,
      embroidery_color: s.embroidery_color,
    }));
    setScarfDesigns(parsed);
    if (parsed.length > 0) setScarfDesignId(parsed[0].id);

    setLoading(false);
  };

  const logoIsAll = orderInfo && orderInfo.logo_embroidery_enabled && (orderInfo.logo_embroidery_count === 0 || orderInfo.logo_embroidery_count >= orderInfo.student_count);
  const canAddLogo = logoIsAll || (orderInfo && orderInfo.logo_embroidery_count > 0 && existingLogoCount < orderInfo.logo_embroidery_count);
  const canAddBack = orderInfo && (orderInfo.back_embroidery_count === 0 || existingBackCount < orderInfo.back_embroidery_count);

  const selectedHat = hatEmbroideries.find(h => h.id === hatEmbroideryId);
  const isHatNone = !hatEmbroideryId || hatEmbroideryId === noEmbroideryId || selectedHat?.name === 'بدون تطريز';
  const canAddHat = isHatNone || (orderInfo && (orderInfo.hat_embroidery_count === 0 || existingHatCount < orderInfo.hat_embroidery_count));

  const handleSubmit = async () => {
    if (!orderId || !name.trim()) {
      toast({ title: 'يرجى إدخال الاسم', variant: 'destructive' });
      return;
    }

    // Validate hat extra text
    if (!isHatNone && selectedHat?.has_extra_text && !hatExtraText.trim()) {
      toast({ title: 'يرجى إدخال نص تطريز القبعة', variant: 'destructive' });
      return;
    }

    setSaving(true);

    const nextSerial = existingCount + 1;
    const { error } = await supabase.from('students').insert({
      order_id: orderId,
      serial_number: nextSerial,
      name: name.trim(),
      size: size || null,
      scarf_design_id: scarfDesignId || null,
      hat_embroidery_id: isHatNone ? null : hatEmbroideryId,
      hat_extra_text: !isHatNone ? (hatExtraText.trim() || null) : null,
      hat_choice: null,
      has_logo_embroidery: hasLogoEmbroidery,
      back_embroidery_text: backEmbroideryText.trim() || null,
      extra_services: [],
    } as any);

    if (error) {
      toast({ title: 'خطأ في الحفظ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم التسجيل بنجاح ✓' });
      setName('');
      setSize('');
      if (noEmbroideryId) setHatEmbroideryId(noEmbroideryId);
      setHatExtraText('');
      if (!logoIsAll) setHasLogoEmbroidery(false);
      setBackEmbroideryText('');
      if (scarfDesigns.length > 0) setScarfDesignId(scarfDesigns[0].id);
      setExistingCount(prev => prev + 1);
      if (hasLogoEmbroidery) setExistingLogoCount(prev => prev + 1);
      if (backEmbroideryText.trim()) setExistingBackCount(prev => prev + 1);
      if (!isHatNone) setExistingHatCount(prev => prev + 1);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <p className="text-muted-foreground">الطلب غير موجود</p>
      </div>
    );
  }

  const maxStudents = orderInfo?.student_count || 30;
  const isFull = existingCount >= maxStudents;

  return (
    <div className="min-h-screen bg-background p-4" dir="rtl">
      <div className="max-w-md mx-auto space-y-4 pt-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-primary">
              <School className="h-5 w-5" />
            </div>
            <h1 className="text-lg font-bold text-foreground">تسجيل الطالبة</h1>
          </div>
          <img src="/logo.svg" alt="متجر Areba" className="h-8 object-contain" />
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            إجمالي الطالبات المسجلات: {existingCount} من {maxStudents}
          </p>
        </div>

        {/* Scarf Design Cards - Accordion */}
        {scarfDesigns.length > 0 && (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between p-3 rounded-xl border border-border bg-card shadow-sm hover:bg-accent/5 transition-colors">
                <span className="text-sm font-medium text-foreground">استعراض بيانات الأوشحة</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 p-3 rounded-xl border border-border bg-card shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 justify-items-center">
                  {scarfDesigns.map((scarf, idx) => (
                    <div key={scarf.id} className="w-full max-w-[300px] rounded-lg border border-border bg-background shadow-sm">
                      <div className="px-3 py-1.5 border-b border-border bg-muted/30">
                        <span className="text-xs font-semibold text-foreground">وشاح {idx + 1}</span>
                      </div>
                      <div className="p-3 space-y-1.5 text-[13px] text-right">
                        <div className="flex justify-between"><span className="text-muted-foreground">تصميم الوشاح:</span><span className="font-medium text-foreground">{scarf.scarf_style_name || '---'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">نوع التاريخ:</span><span className="font-medium text-foreground">{scarf.date_type_name || '---'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">طرف الوشاح:</span><span className="font-medium text-foreground">{scarf.scarf_method_name || '---'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">اتجاه التطريز:</span><span className="font-medium text-foreground">{scarf.embroidery_direction_name || '---'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">خط التطريز:</span><span className="font-medium text-foreground">{scarf.font_name || '---'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">لون التطريز:</span><span className="font-medium text-foreground">{scarf.embroidery_color || '---'}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {isFull ? (
          <Card className="border-warning/30 bg-warning/5">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-warning font-medium">تم اكتمال العدد المطلوب من الطالبات</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/50">
            <CardContent className="p-4 space-y-4">
              {/* Name */}
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">اسم الطالبة *</label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="أدخلي اسمك" className="bg-background" />
              </div>

              {/* Size */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">المقاس</label>
                <div className="flex flex-wrap gap-1.5">
                  {SIZES.map(s => (
                    <button
                      key={s}
                      onClick={() => setSize(s)}
                      className={`min-w-[42px] h-9 rounded-lg text-sm font-medium transition-all ${
                        size === s
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-muted text-muted-foreground hover:bg-accent/20'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scarf Selection */}
              {scarfDesigns.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">الوشاح</label>
                  <Select value={scarfDesignId} onValueChange={setScarfDesignId}>
                    <SelectTrigger><SelectValue placeholder="اختر الوشاح" /></SelectTrigger>
                    <SelectContent>
                      {scarfDesigns.map((s, i) => (
                        <SelectItem key={s.id} value={s.id}>
                          وشاح {i + 1} {s.scarf_style_name ? `- ${s.scarf_style_name}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Hat Embroidery */}
              {orderInfo?.hat_embroidery_enabled && hatEmbroideries.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground block">تطريز القبعة</label>
                  <Select
                    value={hatEmbroideryId}
                    onValueChange={(v) => {
                      const hat = hatEmbroideries.find(h => h.id === v);
                      const none = !v || v === noEmbroideryId || hat?.name === 'بدون تطريز';
                      if (!none && orderInfo.hat_embroidery_count > 0 && existingHatCount >= orderInfo.hat_embroidery_count) {
                        toast({ title: 'تم الوصول للحد الأقصى لتطريز القبعات', variant: 'destructive' });
                        return;
                      }
                      setHatEmbroideryId(v);
                      if (none) setHatExtraText('');
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="بدون تطريز" /></SelectTrigger>
                    <SelectContent>
                      {hatEmbroideries.map(h => (
                        <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                   {!isHatNone && selectedHat?.has_extra_text && (
                    <Input
                      value={hatExtraText}
                      onChange={e => setHatExtraText(e.target.value)}
                      placeholder="نص تطريز القبعة"
                      maxLength={10}
                      className="bg-background"
                    />
                  )}
                </div>
              )}

              {/* Logo Embroidery */}
              {orderInfo?.logo_embroidery_enabled && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                  <Checkbox
                    checked={hasLogoEmbroidery}
                    onCheckedChange={(v) => setHasLogoEmbroidery(!!v)}
                    disabled={!!logoIsAll || (!hasLogoEmbroidery && !canAddLogo)}
                  />
                  <span className="text-sm text-foreground">تطريز شعار</span>
                  {logoIsAll && <Badge variant="secondary" className="text-[10px] mr-auto">مفعّل للجميع</Badge>}
                </div>
              )}

              {/* Back Embroidery */}
              {orderInfo?.back_embroidery_enabled && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground block">تطريز خلفي</label>
                  <Input
                    value={backEmbroideryText}
                    onChange={e => {
                      if (!backEmbroideryText.trim() && e.target.value.trim() && !canAddBack) return;
                      setBackEmbroideryText(e.target.value);
                    }}
                    placeholder="النص المطلوب"
                    className="bg-background"
                  />
                  {!canAddBack && !backEmbroideryText.trim() && (
                    <p className="text-[10px] text-muted-foreground">تم الوصول للحد الأقصى</p>
                  )}
                </div>
              )}

              {/* Submit */}
              <Button onClick={handleSubmit} disabled={saving} className="w-full gap-1.5 h-11">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'جارٍ التسجيل...' : 'تسجيل'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
