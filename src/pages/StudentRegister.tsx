import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Save, Loader2, School } from 'lucide-react';

const SIZES = ['48', '50', '52', '54', '56', '58', '60', '62', '64'];
const HAT_OPTIONS = ['بدون', 'بونيه', 'طاقية'];

interface ScarfDesign {
  id: string;
  sort_order: number;
  scarf_style_name?: string;
  date_type_name?: string;
  scarf_method_name?: string;
  embroidery_direction_name?: string;
  font_name?: string;
  embroidery_color?: string;
  scarf_style_image?: string | null;
}

interface OrderInfo {
  student_count: number;
  logo_embroidery_enabled: boolean;
  logo_embroidery_count: number;
  back_embroidery_enabled: boolean;
  back_embroidery_count: number;
}

export default function StudentRegister() {
  const { orderId } = useParams<{ orderId: string }>();
  const { toast } = useToast();
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
  const [scarfDesigns, setScarfDesigns] = useState<ScarfDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [size, setSize] = useState('');
  const [scarfDesignId, setScarfDesignId] = useState('');
  const [hatChoice, setHatChoice] = useState('');
  const [hasLogoEmbroidery, setHasLogoEmbroidery] = useState(false);
  const [backEmbroideryText, setBackEmbroideryText] = useState('');

  // Counts
  const [existingCount, setExistingCount] = useState(0);
  const [existingLogoCount, setExistingLogoCount] = useState(0);
  const [existingBackCount, setExistingBackCount] = useState(0);

  useEffect(() => {
    if (!orderId) return;
    loadData();
  }, [orderId]);

  const loadData = async () => {
    const [orderRes, countRes] = await Promise.all([
      supabase
        .from('orders')
        .select('student_count, logo_embroidery_enabled, logo_embroidery_count, back_embroidery_enabled, back_embroidery_count')
        .eq('id', orderId!)
        .maybeSingle(),
      supabase.from('students').select('has_logo_embroidery, back_embroidery_text').eq('order_id', orderId!),
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
    };
    setOrderInfo(info);

    const studentsData = countRes.data || [];
    setExistingCount(studentsData.length);
    setExistingLogoCount(studentsData.filter((s: any) => s.has_logo_embroidery).length);
    setExistingBackCount(studentsData.filter((s: any) => s.back_embroidery_text?.trim()).length);

    // Logo is "all" → auto-enable
    const logoIsAll = info.logo_embroidery_enabled && (info.logo_embroidery_count === 0 || info.logo_embroidery_count >= info.student_count);
    if (logoIsAll) setHasLogoEmbroidery(true);

    // Load scarf designs with full details
    const { data: scarfs } = await supabase
      .from('order_scarf_designs')
      .select(`
        id, sort_order, embroidery_color,
        scarf_styles!scarf_style_id(name, image_url),
        date_types!date_type_id(name),
        scarf_methods!scarf_method_id(name),
        embroidery_directions!embroidery_direction_id(name),
        fonts!font_id(name)
      `)
      .eq('order_id', orderId!)
      .order('sort_order');

    const parsed: ScarfDesign[] = (scarfs || []).map((s: any) => ({
      id: s.id,
      sort_order: s.sort_order,
      scarf_style_name: s.scarf_styles?.name,
      scarf_style_image: s.scarf_styles?.image_url,
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

  const handleSubmit = async () => {
    if (!orderId || !name.trim()) {
      toast({ title: 'يرجى إدخال الاسم', variant: 'destructive' });
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
      hat_choice: hatChoice || null,
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
      setHatChoice('');
      if (!logoIsAll) setHasLogoEmbroidery(false);
      setBackEmbroideryText('');
      if (scarfDesigns.length > 0) setScarfDesignId(scarfDesigns[0].id);
      setExistingCount(prev => prev + 1);
      if (hasLogoEmbroidery) setExistingLogoCount(prev => prev + 1);
      if (backEmbroideryText.trim()) setExistingBackCount(prev => prev + 1);
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
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 text-primary">
            <School className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-bold text-foreground">تسجيل الطالبة</h1>
          <p className="text-xs text-muted-foreground">
            {existingCount} / {maxStudents} طالبة مسجلة
          </p>
        </div>

        {/* Scarf Design Cards - Same as Leader Page */}
        {scarfDesigns.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {scarfDesigns.map((scarf, idx) => (
              <div key={scarf.id} className="min-w-[160px] p-2.5 rounded-lg border border-border bg-card flex-shrink-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="text-[10px]">وشاح {idx + 1}</Badge>
                </div>
                {scarf.scarf_style_image && (
                  <div className="w-12 h-12 rounded-lg border border-border overflow-hidden bg-muted/30 mb-2">
                    <img src={scarf.scarf_style_image} className="w-full h-full object-contain" alt="تصميم الوشاح" />
                  </div>
                )}
                <div className="space-y-0.5 text-[10px] text-muted-foreground">
                  {scarf.scarf_style_name && <p>التصميم: {scarf.scarf_style_name}</p>}
                  {scarf.date_type_name && <p>التاريخ: {scarf.date_type_name}</p>}
                  {scarf.scarf_method_name && <p>الطرف: {scarf.scarf_method_name}</p>}
                  {scarf.embroidery_direction_name && <p>الاتجاه: {scarf.embroidery_direction_name}</p>}
                  {scarf.font_name && <p>الخط: {scarf.font_name}</p>}
                  {scarf.embroidery_color && <p>اللون: {scarf.embroidery_color}</p>}
                </div>
              </div>
            ))}
          </div>
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

              {/* Hat */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">القبعة</label>
                <div className="flex flex-wrap gap-1.5">
                  {HAT_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      onClick={() => setHatChoice(opt)}
                      className={`px-4 h-9 rounded-lg text-sm font-medium transition-all ${
                        hatChoice === opt
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-muted text-muted-foreground hover:bg-accent/20'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

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
