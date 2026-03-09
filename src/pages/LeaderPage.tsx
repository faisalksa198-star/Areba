import { useState, useCallback, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Save, Plus, Trash2, Users, Loader2, Send, Truck, ChevronDown } from 'lucide-react';
import ScarfCard from '@/components/orders/ScarfCard';
import OrderInfoHeader from '@/components/orders/OrderInfoHeader';
import { mapOrderScarfDesign } from '@/lib/order-scarf-binding';

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
  scarf_style_image?: string | null;
  date_type_image?: string | null;
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
  data_submitted: boolean;
}

interface ShippingInfo {
  recipient_name: string;
  recipient_phone: string;
  shipping_city_id: string;
  district: string;
  address_details: string;
  national_address: string;
}

interface City {
  id: string;
  name: string;
}

interface StudentRow {
  id: string;
  serialNumber: number;
  name: string;
  size: string;
  scarfDesignId: string;
  hatEmbroideryId: string;
  hatExtraText: string;
  hasLogoEmbroidery: boolean;
  backEmbroideryText: string;
  nameError: string;
  similarWarning: string;
}

function createEmptyRow(serial: number, defaultScarfId: string, noEmbroideryId: string): StudentRow {
  return {
    id: crypto.randomUUID(),
    serialNumber: serial,
    name: '',
    size: '',
    scarfDesignId: defaultScarfId,
    hatEmbroideryId: noEmbroideryId,
    hatExtraText: '',
    hasLogoEmbroidery: false,
    backEmbroideryText: '',
    nameError: '',
    similarWarning: '',
  };
}

function validateName(raw: string): { cleaned: string; error: string } {
  const cleaned = raw.trim().replace(/\s+/g, ' ');
  if (!cleaned) return { cleaned, error: '' };
  const isArabic = /[\u0600-\u06FF]/.test(cleaned);
  const words = cleaned.split(' ').map(w => w.replace(/-/g, '')).filter(Boolean);
  if (isArabic && words.length > 3) return { cleaned, error: 'الاسم العربي يجب ألا يتجاوز 3 كلمات' };
  if (!isArabic && words.length > 2) return { cleaned, error: 'الاسم الإنجليزي يجب ألا يتجاوز كلمتين' };
  return { cleaned, error: '' };
}

function areSimilar(a: string, b: string): boolean {
  if (!a || !b) return false;
  const la = a.toLowerCase().trim();
  const lb = b.toLowerCase().trim();
  if (la === lb) return true;
  if (la.length < 2 || lb.length < 2) return false;
  if (la.includes(lb) || lb.includes(la)) return true;
  if (Math.abs(la.length - lb.length) > 2) return false;
  let diff = 0;
  const maxLen = Math.max(la.length, lb.length);
  for (let i = 0; i < maxLen; i++) {
    if (la[i] !== lb[i]) diff++;
    if (diff > 2) return false;
  }
  return diff <= 2;
}

export default function LeaderPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { toast } = useToast();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [maxStudents, setMaxStudents] = useState(30);
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
  const [scarfDesigns, setScarfDesigns] = useState<ScarfDesign[]>([]);
  const [hatEmbroideries, setHatEmbroideries] = useState<HatEmbroideryOption[]>([]);
  const [noEmbroideryId, setNoEmbroideryId] = useState('');
  const [cities, setCities] = useState<City[]>([]);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [shippingOpen, setShippingOpen] = useState(false);

  // Shipping state
  const [shipping, setShipping] = useState<ShippingInfo>({
    recipient_name: '',
    recipient_phone: '',
    shipping_city_id: '',
    district: '',
    address_details: '',
    national_address: '',
  });

  useEffect(() => {
    if (!orderId) return;
    setLoading(true);
    setNotFound(false);
    loadCities();
    loadData();
  }, [orderId]);

  const loadCities = async () => {
    const { data, error } = await supabase
      .from('cities')
      .select('id, name')
      .order('name');

    console.log('[Cities] data:', data, 'error:', error);
    setCities((data as City[]) || []);
  };

  const loadData = async () => {
    console.log('[LeaderPage] orderId:', orderId);

    // Load order info with shipping + leader_phone
    const { data: order } = await supabase
      .from('orders')
      .select('student_count, logo_embroidery_enabled, logo_embroidery_count, back_embroidery_enabled, back_embroidery_count, hat_embroidery_enabled, hat_embroidery_count, recipient_name, recipient_phone, shipping_city_id, district, address_details, national_address, data_submitted, leader_phone')
      .eq('id', orderId!)
      .maybeSingle();

    if (!order) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const o = order as any;
    const info: OrderInfo = {
      student_count: o.student_count || 30,
      logo_embroidery_enabled: o.logo_embroidery_enabled || false,
      logo_embroidery_count: o.logo_embroidery_count || 0,
      back_embroidery_enabled: o.back_embroidery_enabled || false,
      back_embroidery_count: o.back_embroidery_count || 0,
      hat_embroidery_enabled: o.hat_embroidery_enabled || false,
      hat_embroidery_count: o.hat_embroidery_count || 0,
      data_submitted: o.data_submitted || false,
    };
    setOrderInfo(info);
    setMaxStudents(info.student_count);

    // Load shipping info - auto-fill phone from leader_phone if empty
    setShipping({
      recipient_name: o.recipient_name || '',
      recipient_phone: o.recipient_phone || o.leader_phone || '',
      shipping_city_id: o.shipping_city_id || '',
      district: o.district || '',
      address_details: o.address_details || '',
      national_address: o.national_address || '',
    });

    // Load hat embroideries + scarf designs + existing students + debug lookup tables
    const [hatsRes, scarfsRes, studentsRes, scarfStylesRes, dateTypesRes] = await Promise.all([
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
      supabase.from('students').select('*').eq('order_id', orderId!).order('serial_number'),
      supabase.from('scarf_styles').select('id, name, image_url').order('created_at'),
      supabase.from('date_types').select('id, name, image_url').order('created_at'),
    ]);

    console.log('[ScarfStyles] data:', scarfStylesRes.data, 'error:', scarfStylesRes.error);
    console.log('[DateTypes] data:', dateTypesRes.data, 'error:', dateTypesRes.error);
    console.log('[OrderScarfDesigns] data:', scarfsRes.data, 'error:', scarfsRes.error, 'orderId:', orderId);

    const hatsSorted = ((hatsRes.data as any[]) || [])
      .sort((a, b) => {
        if (a.name === 'بدون تطريز') return -1;
        if (b.name === 'بدون تطريز') return 1;
        return String(a.name).localeCompare(String(b.name), 'ar');
      }) as HatEmbroideryOption[];
    setHatEmbroideries(hatsSorted);
    const noneId = hatsSorted.find(h => h.name === 'بدون تطريز')?.id || '';
    setNoEmbroideryId(noneId);

    const parsedScarfs: ScarfDesign[] = ((scarfsRes.data as any[]) || []).map(mapOrderScarfDesign);
    setScarfDesigns(parsedScarfs);

    const defaultScarfId = parsedScarfs[0]?.id || '';

    // Check if logo embroidery is "all"
    const logoIsAll = info.logo_embroidery_enabled && (info.logo_embroidery_count === 0 || info.logo_embroidery_count >= info.student_count);

    const existingStudents = (studentsRes.data as any[]) || [];
    if (existingStudents.length > 0) {
      setStudents(existingStudents.map((s: any) => ({
        id: s.id,
        serialNumber: s.serial_number,
        name: s.name || '',
        size: s.size || '',
        scarfDesignId: s.scarf_design_id || defaultScarfId,
        hatEmbroideryId: s.hat_embroidery_id || noneId,
        hatExtraText: s.hat_extra_text || '',
        hasLogoEmbroidery: s.has_logo_embroidery || false,
        backEmbroideryText: s.back_embroidery_text || '',
        nameError: '',
        similarWarning: '',
      })));
    } else {
      // Initialize rows
      setStudents(Array.from({ length: 5 }, (_, i) => {
        const row = createEmptyRow(i + 1, defaultScarfId, noneId);
        if (logoIsAll) row.hasLogoEmbroidery = true;
        return row;
      }));
    }

    setLoading(false);
  };

  const logoIsAll = orderInfo && orderInfo.logo_embroidery_enabled && (orderInfo.logo_embroidery_count === 0 || orderInfo.logo_embroidery_count >= maxStudents);

  const logoCount = useMemo(() => students.filter(s => s.hasLogoEmbroidery).length, [students]);
  const backCount = useMemo(() => students.filter(s => s.backEmbroideryText.trim()).length, [students]);

  const updateStudent = useCallback((id: string, field: keyof StudentRow, value: any) => {
    setStudents(prev => prev.map(s => {
      if (s.id !== id) return s;
      const newS = { ...s, [field]: value };
      if (field === 'name') {
        const { cleaned, error } = validateName(value as string);
        newS.name = value as string;
        newS.nameError = error;
        const similar = prev.find(other => other.id !== id && areSimilar(cleaned, other.name.trim()));
        newS.similarWarning = similar ? `اسم مشابه: "${similar.name.trim()}" (صف ${similar.serialNumber})` : '';
      }
      return newS;
    }));
  }, []);

  const addRow = useCallback(() => {
    const defaultScarfId = scarfDesigns[0]?.id || '';
    setStudents(prev => {
      if (prev.length >= maxStudents) {
        toast({ title: `لا يمكن إضافة أكثر من ${maxStudents} صف`, variant: 'destructive' });
        return prev;
      }
      const row = createEmptyRow(prev.length + 1, defaultScarfId, noEmbroideryId);
      if (logoIsAll) row.hasLogoEmbroidery = true;
      return [...prev, row];
    });
  }, [scarfDesigns, logoIsAll, noEmbroideryId, maxStudents, toast]);

  const removeRow = useCallback((id: string) => {
    setStudents(prev => prev.filter(s => s.id !== id).map((s, i) => ({ ...s, serialNumber: i + 1 })));
  }, []);

  const toggleLogo = useCallback((id: string) => {
    if (logoIsAll) return;
    setStudents(prev => {
      const student = prev.find(s => s.id === id);
      if (!student) return prev;
      const currentCount = prev.filter(s => s.hasLogoEmbroidery).length;
      if (!student.hasLogoEmbroidery && orderInfo && orderInfo.logo_embroidery_count > 0 && currentCount >= orderInfo.logo_embroidery_count) return prev;
      return prev.map(s => s.id === id ? { ...s, hasLogoEmbroidery: !s.hasLogoEmbroidery } : s);
    });
  }, [logoIsAll, orderInfo]);

  const updateShipping = (field: keyof ShippingInfo, value: string) => {
    setShipping(prev => ({ ...prev, [field]: value }));
  };

  const validateAll = (): string[] => {
    const errors: string[] = [];
    const filledStudents = students.filter(s => s.name.trim());

    if (filledStudents.length === 0) {
      errors.push('يجب إدخال بيانات طالبة واحدة على الأقل');
    }

    filledStudents.forEach((s) => {
      if (!s.size) errors.push(`الطالبة رقم ${s.serialNumber} ينقصها اختيار المقاس`);
      if (s.nameError) errors.push(`الطالبة رقم ${s.serialNumber}: ${s.nameError}`);

      const hat = hatEmbroideries.find(h => h.id === s.hatEmbroideryId);
      const isNone = !s.hatEmbroideryId || s.hatEmbroideryId === noEmbroideryId || hat?.name === 'بدون تطريز';
      if (!isNone && hat?.has_extra_text && !s.hatExtraText.trim()) {
        errors.push(`الطالبة رقم ${s.serialNumber} ينقصها نص تطريز القبعة`);
      }
      if (!orderInfo?.hat_embroidery_enabled && !isNone) {
        errors.push(`الطالبة رقم ${s.serialNumber}: خدمة تطريز القبعات غير مفعّلة لهذا الطلب`);
      }
    });

    // Hat embroidery limit
    if (orderInfo?.hat_embroidery_enabled && orderInfo.hat_embroidery_count > 0) {
      const chosen = students.filter(s => s.hatEmbroideryId && s.hatEmbroideryId !== noEmbroideryId).length;
      if (chosen > orderInfo.hat_embroidery_count) {
        errors.push(`تم اختيار تطريز القبعات لأكثر من العدد المسموح (${chosen} / ${orderInfo.hat_embroidery_count})`);
      }
    }

    // Shipping validation
    if (!shipping.recipient_name.trim()) errors.push('يجب إدخال اسم المستلم');
    if (!shipping.recipient_phone.trim()) errors.push('يجب إدخال رقم الجوال');
    if (!shipping.shipping_city_id) errors.push('يجب اختيار المدينة');
    if (!shipping.district.trim()) errors.push('يجب إدخال الحي');
    if (!shipping.address_details.trim()) errors.push('يجب إدخال تفاصيل العنوان');

    return errors;
  };

  const handleSave = async () => {
    if (!orderId) return;
    setSaving(true);
    setValidationErrors([]);

    // Delete existing students and insert new ones
    await supabase.from('students').delete().eq('order_id', orderId);

    const rows = students.filter(s => s.name.trim()).map(s => {
      const hat = hatEmbroideries.find(h => h.id === s.hatEmbroideryId);
      const isNone = !s.hatEmbroideryId || s.hatEmbroideryId === noEmbroideryId || hat?.name === 'بدون تطريز';
      return {
        order_id: orderId,
        serial_number: s.serialNumber,
        name: s.name.trim(),
        size: s.size || null,
        scarf_design_id: s.scarfDesignId || null,
        hat_choice: null,
        hat_embroidery_id: isNone ? null : s.hatEmbroideryId,
        hat_extra_text: !isNone ? (s.hatExtraText.trim() || null) : null,
        has_logo_embroidery: s.hasLogoEmbroidery,
        back_embroidery_text: s.backEmbroideryText.trim() || null,
        extra_services: [],
      };
    });

    if (rows.length > 0) {
      const { error: studentsError } = await supabase.from('students').insert(rows as any);
      if (studentsError) {
        toast({ title: 'خطأ في حفظ بيانات الطالبات', description: studentsError.message, variant: 'destructive' });
        setSaving(false);
        return;
      }
    }

    // Save shipping info
    const { error: shippingError } = await supabase
      .from('orders')
      .update({
        recipient_name: shipping.recipient_name.trim() || null,
        recipient_phone: shipping.recipient_phone.trim() || null,
        shipping_city_id: shipping.shipping_city_id || null,
        district: shipping.district.trim() || null,
        address_details: shipping.address_details.trim() || null,
        national_address: shipping.national_address.trim() || null,
      } as any)
      .eq('id', orderId);

    if (shippingError) {
      toast({ title: 'خطأ في حفظ بيانات الشحن', description: shippingError.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم الحفظ بنجاح ✓' });
    }
    setSaving(false);
  };

  const handleFinalSubmit = async () => {
    if (!orderId) return;

    const errors = validateAll();
    if (errors.length > 0) {
      setValidationErrors(errors);
      toast({ title: 'يوجد حقول ناقصة', description: 'يرجى مراجعة التنبيهات أدناه', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    setValidationErrors([]);

    // Save everything first
    await handleSave();

    // Mark as submitted
    const { error } = await supabase
      .from('orders')
      .update({ data_submitted: true, status: 'in_progress' } as any)
      .eq('id', orderId);

    if (error) {
      toast({ title: 'خطأ في إرسال البيانات', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم إرسال البيانات بنجاح ✓' });
      setOrderInfo(prev => prev ? { ...prev, data_submitted: true } : prev);
    }
    setSubmitting(false);
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

  const showLogo = orderInfo?.logo_embroidery_enabled;
  const showBack = orderInfo?.back_embroidery_enabled;
  const isSubmitted = orderInfo?.data_submitted;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Order Info Header */}
      <OrderInfoHeader orderId={orderId!} />

      {/* Header */}
      <div className="sticky top-0 z-30 bg-card border-b border-border shadow-sm">
        <div className="px-4 py-3">
          <h1 className="text-lg font-bold text-foreground">إدخال بيانات الطالبات</h1>
          <div className="flex items-center gap-3 mt-2 text-sm flex-wrap">
            <Badge variant="secondary" className="gap-1">
              <Users className="h-3 w-3" />
              إجمالي الطالبات المسجلات: {students.filter(s => s.name.trim()).length} من {maxStudents}
            </Badge>
            {showLogo && (
              <Badge variant="outline" className="gap-1">
                شعار: {logoCount} / {logoIsAll ? 'الكل' : orderInfo.logo_embroidery_count}
              </Badge>
            )}
            {showBack && (
              <Badge variant="outline" className="gap-1">
                تطريز خلفي: {backCount} / {orderInfo!.back_embroidery_count || 'الكل'}
              </Badge>
            )}
            {orderInfo?.hat_embroidery_enabled && (
              <Badge variant="outline" className="gap-1">
                تطريز قبعات: {students.filter(s => s.hatEmbroideryId && s.hatEmbroideryId !== noEmbroideryId).length} / {orderInfo!.hat_embroidery_count || 'الكل'}
              </Badge>
            )}
            {isSubmitted && (
              <Badge className="bg-success/10 text-success border-success/20">تم الإرسال</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="px-3 pt-3">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {validationErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Scarf Design Cards */}
      {scarfDesigns.length > 0 && (
        <div className="px-3 pt-3">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {scarfDesigns.map((scarf, idx) => (
              <ScarfCard key={scarf.id} scarf={scarf} index={idx} />
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="px-3 pt-3">
        <div className="overflow-x-auto rounded-xl border border-border">
          <div className="min-w-[700px] max-h-[calc(100vh-400px)] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-20 bg-card border-b border-border">
                <tr>
                  <th className="w-12 px-2 py-3 text-center font-semibold text-muted-foreground">#</th>
                  <th className="w-[200px] px-2 py-3 text-right font-semibold text-muted-foreground">اسم الطالبة</th>
                  <th className="w-[160px] px-2 py-3 text-center font-semibold text-muted-foreground">المقاس</th>
                  <th className="w-[120px] px-2 py-3 text-center font-semibold text-muted-foreground">الوشاح</th>
                  <th className="w-[120px] px-2 py-3 text-center font-semibold text-muted-foreground">القبعة</th>
                  {showLogo && <th className="w-[70px] px-2 py-3 text-center font-semibold text-muted-foreground">شعار</th>}
                  {showBack && <th className="w-[140px] px-2 py-3 text-center font-semibold text-muted-foreground">تطريز خلفي</th>}
                  <th className="w-12 px-2 py-3 text-center font-semibold text-muted-foreground">حذف</th>
                </tr>
              </thead>
              <tbody>
                {students.map(student => (
                  <tr key={student.id} className="border-b border-border/50 align-top">
                    <td className="px-2 py-3 text-center text-xs font-bold text-muted-foreground">{student.serialNumber}</td>
                    <td className="px-2 py-2.5">
                      <Input
                        value={student.name}
                        onChange={e => updateStudent(student.id, 'name', e.target.value)}
                        onBlur={e => updateStudent(student.id, 'name', e.target.value.trim().replace(/\s+/g, ' '))}
                        placeholder="الاسم"
                        className="h-9 text-xs"
                        disabled={isSubmitted}
                      />
                      {student.nameError && (
                        <p className="text-[10px] text-destructive flex items-center gap-1 mt-1">
                          <AlertTriangle className="h-3 w-3 shrink-0" />{student.nameError}
                        </p>
                      )}
                      {student.similarWarning && (
                        <p className="text-[10px] text-warning flex items-center gap-1 mt-1">
                          <AlertTriangle className="h-3 w-3 shrink-0" />{student.similarWarning}
                        </p>
                      )}
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {SIZES.map(size => (
                          <button
                            key={size}
                            onClick={() => updateStudent(student.id, 'size', size)}
                            disabled={isSubmitted}
                            className={`min-w-[32px] h-7 rounded-md text-xs font-medium transition-colors ${
                              student.size === size
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground hover:bg-accent'
                            } disabled:opacity-50`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-2 py-2.5">
                      {scarfDesigns.length > 0 ? (
                        <Select
                          value={student.scarfDesignId}
                          onValueChange={v => updateStudent(student.id, 'scarfDesignId', v)}
                          disabled={isSubmitted}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="اختر" />
                          </SelectTrigger>
                          <SelectContent>
                            {scarfDesigns.map((s, i) => (
                              <SelectItem key={s.id} value={s.id}>وشاح {i + 1}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="flex items-center justify-center gap-1">
                        <Select
                          value={student.hatEmbroideryId}
                          onValueChange={(v) => {
                            const hat = hatEmbroideries.find(h => h.id === v);
                            const isNone = !v || v === noEmbroideryId || hat?.name === 'بدون تطريز';

                            if (!isNone) {
                              if (!orderInfo?.hat_embroidery_enabled) {
                                toast({ title: 'خدمة تطريز القبعات غير مفعّلة لهذا الطلب', variant: 'destructive' });
                                return;
                              }

                              const currentChosen = students.filter(s => s.id !== student.id && s.hatEmbroideryId && s.hatEmbroideryId !== noEmbroideryId).length;
                              if (orderInfo.hat_embroidery_count > 0 && currentChosen >= orderInfo.hat_embroidery_count) {
                                toast({ title: 'تم الوصول للحد الأقصى لتطريز القبعات', variant: 'destructive' });
                                return;
                              }
                            }

                            updateStudent(student.id, 'hatEmbroideryId', v);
                            if (isNone) updateStudent(student.id, 'hatExtraText', '');
                          }}
                          disabled={isSubmitted || !orderInfo?.hat_embroidery_enabled}
                        >
                          <SelectTrigger className="h-8 text-xs w-[120px]">
                            <SelectValue placeholder="بدون تطريز" />
                          </SelectTrigger>
                          <SelectContent>
                            {hatEmbroideries.map(h => (
                              <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {(() => {
                          const hat = hatEmbroideries.find(h => h.id === student.hatEmbroideryId);
                          const needsText = !!hat?.has_extra_text && student.hatEmbroideryId && student.hatEmbroideryId !== noEmbroideryId;
                          if (!needsText) return null;
                          return (
                             <Input
                              value={student.hatExtraText}
                              onChange={e => updateStudent(student.id, 'hatExtraText', e.target.value)}
                              placeholder="نص تطريز القبعة"
                              maxLength={10}
                              className="h-8 text-xs w-[120px]"
                              disabled={isSubmitted}
                            />
                          );
                        })()}
                      </div>
                    </td>
                    {showLogo && (
                      <td className="px-2 py-2.5 text-center">
                        <Checkbox
                          checked={student.hasLogoEmbroidery}
                          onCheckedChange={() => toggleLogo(student.id)}
                          disabled={!!logoIsAll || isSubmitted}
                        />
                      </td>
                    )}
                    {showBack && (
                      <td className="px-2 py-2.5">
                        <Input
                          value={student.backEmbroideryText}
                          onChange={e => {
                            if (!student.backEmbroideryText.trim() && e.target.value.trim()) {
                              const currentBack = students.filter(s => s.id !== student.id && s.backEmbroideryText.trim()).length;
                              if (orderInfo && orderInfo.back_embroidery_count > 0 && currentBack >= orderInfo.back_embroidery_count) return;
                            }
                            updateStudent(student.id, 'backEmbroideryText', e.target.value);
                          }}
                          placeholder="النص"
                          className="h-8 text-xs"
                          disabled={isSubmitted}
                        />
                      </td>
                    )}
                    <td className="px-2 py-2.5 text-center">
                      <button
                        onClick={() => removeRow(student.id)}
                        disabled={isSubmitted}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Row */}
      {!isSubmitted && (
        <div className="px-3 pt-2">
          <Button variant="outline" size="sm" onClick={addRow} className="gap-1">
            <Plus className="h-3.5 w-3.5" /> إضافة صف
          </Button>
        </div>
      )}

      {/* Shipping Section */}
      <div className="px-3 pt-4 pb-28">
        <Collapsible open={shippingOpen} onOpenChange={setShippingOpen}>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:bg-accent/5 transition-colors">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Truck className="h-4 w-4 text-primary" />
                بيانات الشحن
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${shippingOpen ? 'rotate-180' : ''}`} />
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="mt-2 p-4 rounded-xl border border-border bg-card">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">اسم المستلم *</label>
                  <Input value={shipping.recipient_name} onChange={e => updateShipping('recipient_name', e.target.value)} placeholder="اسم المستلم" className="h-8 text-xs" disabled={isSubmitted} />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">رقم الجوال *</label>
                  <Input value={shipping.recipient_phone} onChange={e => updateShipping('recipient_phone', e.target.value)} placeholder="05XXXXXXXX" className="h-8 text-xs" disabled={isSubmitted} />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">المدينة *</label>
                  <Select value={shipping.shipping_city_id} onValueChange={v => updateShipping('shipping_city_id', v)} disabled={isSubmitted}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="اختر المدينة" /></SelectTrigger>
                    <SelectContent>
                      {cities.map(c => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">الحي *</label>
                  <Input value={shipping.district} onChange={e => updateShipping('district', e.target.value)} placeholder="اسم الحي" className="h-8 text-xs" disabled={isSubmitted} />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">تفاصيل العنوان *</label>
                  <Input value={shipping.address_details} onChange={e => updateShipping('address_details', e.target.value)} placeholder="الشارع، رقم المبنى..." className="h-8 text-xs" disabled={isSubmitted} />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">العنوان الوطني (اختياري)</label>
                  <Input value={shipping.national_address} onChange={e => updateShipping('national_address', e.target.value)} placeholder="العنوان الوطني" className="h-8 text-xs" disabled={isSubmitted} />
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Bottom Bar */}
      {!isSubmitted ? (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border p-3 flex justify-center gap-3">
          <Button variant="outline" size="default" onClick={handleSave} disabled={saving} className="gap-1.5">
            <Save className="h-4 w-4" />
            {saving ? 'جارٍ الحفظ...' : 'حفظ'}
          </Button>
          <Button size="default" onClick={handleFinalSubmit} disabled={submitting} className="gap-1.5 bg-success hover:bg-success/90">
            <Send className="h-4 w-4" />
            {submitting ? 'جارٍ الإرسال...' : 'إرسال الطلب'}
          </Button>
        </div>
      ) : (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border p-3">
          <p className="text-center text-sm text-muted-foreground">تم إرسال البيانات - لا يمكن التعديل</p>
        </div>
      )}
    </div>
  );
}
