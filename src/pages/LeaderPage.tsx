import { useState, useCallback, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { generateOrderPdf } from '@/lib/orderPdfGenerator';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Save, Plus, Trash2, Users, Loader2, Send, Truck, ChevronDown, Download, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const SIZES = ['48', '50', '52', '54', '56', '58', '60', '62', '64'];

const FRINGE_COLORS = [
  { value: 'فضي', label: 'فضي' },
  { value: 'ذهبي', label: 'ذهبي' },
  { value: 'أسود', label: 'أسود' },
  { value: 'أبيض', label: 'أبيض' },
];

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
  leader_name: string;
  order_number: string;
  status: string;
  student_count: number;
  extra_scarf_count: number;
  extra_hat_count: number;
  logo_embroidery_enabled: boolean;
  logo_embroidery_count: number;
  back_embroidery_enabled: boolean;
  back_embroidery_count: number;
  hat_embroidery_enabled: boolean;
  hat_embroidery_count: number;
  purple_package_enabled: boolean;
  purple_package_count: number;
  data_submitted: boolean;
  order_type: string;
  kit_name: string;
  abaya_design_name: string;
  sleeve_style_name: string;
  sleeve_color: string;
  custom_abaya_color: string;
  custom_abaya_color_degree: string;
  custom_scarf_color: string;
  custom_scarf_color_degree: string;
  custom_hat_color: string;
  custom_hat_color_degree: string;
  kit_abaya_color: string;
  kit_abaya_color_degree: string;
  kit_scarf_color: string;
  kit_scarf_color_degree: string;
  kit_hat_color: string;
  kit_hat_color_degree: string;
  school_name: string;
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
  hasPurplePackage: boolean;
  nameError: string;
  similarWarning: string;
}

interface ExtraScarfRow {
  id: string;
  serialNumber: number;
  name: string;
  scarfDesignId: string;
  hasLogoEmbroidery: boolean;
  backEmbroideryText: string;
}

interface ExtraHatRow {
  id: string;
  serialNumber: number;
  hatEmbroideryId: string;
  hatExtraText: string;
  fringeColor: string;
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
    hasPurplePackage: false,
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
  // Exact match only
  return la === lb;
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
  const [citySearchOpen, setCitySearchOpen] = useState(false);

  // Extra scarves & hats
  const [extraScarves, setExtraScarves] = useState<ExtraScarfRow[]>([]);
  const [extraHats, setExtraHats] = useState<ExtraHatRow[]>([]);

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
    loadData();
  }, [orderId]);

  const loadData = async () => {
    const { data: order } = await supabase
      .from('orders')
      .select(`
        leader_name, order_number, status, school_name,
        student_count, extra_scarf_count, extra_hat_count,
        logo_embroidery_enabled, logo_embroidery_count, 
        back_embroidery_enabled, back_embroidery_count, hat_embroidery_enabled, hat_embroidery_count,
        purple_package_enabled, purple_package_count,
        recipient_name, recipient_phone, shipping_city_id, district, address_details, national_address, 
        data_submitted, leader_phone, order_type, kit_id, sleeve_color,
        abaya_design_id, sleeve_style_id,
        custom_abaya_color, custom_abaya_color_degree, custom_scarf_color, custom_scarf_color_degree,
        custom_hat_color, custom_hat_color_degree,
        abaya_designs:abaya_design_id(name), sleeve_styles:sleeve_style_id(name),
        ready_kits:kit_id(name, abaya_color, abaya_color_degree, scarf_color, scarf_color_degree, hat_color, hat_color_degree, sleeve_color, abaya_designs:abaya_design_id(name), sleeve_styles:sleeve_style_id(name))
      `)
      .eq('id', orderId!)
      .maybeSingle();

    if (!order) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const o = order as any;
    const kit = o.ready_kits;
    const isKit = o.order_type === 'ready_kit';
    const info: OrderInfo = {
      leader_name: o.leader_name || '',
      order_number: o.order_number || '',
      status: o.status || 'pending_data',
      student_count: o.student_count || 0,
      extra_scarf_count: o.extra_scarf_count || 0,
      extra_hat_count: o.extra_hat_count || 0,
      logo_embroidery_enabled: o.logo_embroidery_enabled || false,
      logo_embroidery_count: o.logo_embroidery_count || 0,
      back_embroidery_enabled: o.back_embroidery_enabled || false,
      back_embroidery_count: o.back_embroidery_count || 0,
      hat_embroidery_enabled: o.hat_embroidery_enabled || false,
      hat_embroidery_count: o.hat_embroidery_count || 0,
      purple_package_enabled: o.purple_package_enabled || false,
      purple_package_count: o.purple_package_count || 0,
      data_submitted: o.data_submitted || false,
      order_type: o.order_type || 'ready_kit',
      kit_name: kit?.name || '',
      abaya_design_name: (isKit ? kit?.abaya_designs?.name : o.abaya_designs?.name) || '',
      sleeve_style_name: (isKit ? kit?.sleeve_styles?.name : o.sleeve_styles?.name) || '',
      sleeve_color: (isKit ? (kit?.sleeve_color || '') : (o.sleeve_color || '')),
      custom_abaya_color: o.custom_abaya_color || '',
      custom_abaya_color_degree: o.custom_abaya_color_degree || '',
      custom_scarf_color: o.custom_scarf_color || '',
      custom_scarf_color_degree: o.custom_scarf_color_degree || '',
      custom_hat_color: o.custom_hat_color || '',
      custom_hat_color_degree: o.custom_hat_color_degree || '',
      kit_abaya_color: kit?.abaya_color || '',
      kit_abaya_color_degree: kit?.abaya_color_degree || '',
      kit_scarf_color: kit?.scarf_color || '',
      kit_scarf_color_degree: kit?.scarf_color_degree || '',
      kit_hat_color: kit?.hat_color || '',
      kit_hat_color_degree: kit?.hat_color_degree || '',
      school_name: o.school_name || '',
    };
    setOrderInfo(info);
    setMaxStudents(info.student_count);

    // Load shipping info
    setShipping({
      recipient_name: o.recipient_name || o.leader_name || '',
      recipient_phone: o.recipient_phone || o.leader_phone || '',
      shipping_city_id: o.shipping_city_id || '',
      district: o.district || '',
      address_details: o.address_details || '',
      national_address: o.national_address || '',
    });

    // Load cities + hat embroideries + scarf designs + existing students + extras
    const [citiesRes, hatsRes, scarfsRes, studentsRes, extraScarvesRes, extraHatsRes] = await Promise.all([
      supabase.from('cities').select('id, name').eq('is_active', true).order('name'),
      supabase.from('hat_embroideries').select('id, name, image_url, has_extra_text').eq('is_active', true).order('created_at'),
      supabase
        .from('order_scarf_designs')
        .select(`
          id, sort_order, embroidery_color,
          scarf_styles(name),
          date_types(name),
          scarf_methods(name),
          embroidery_directions(name),
          fonts(name)
        `)
        .eq('order_id', orderId!)
        .order('sort_order'),
      supabase.from('students').select('*').eq('order_id', orderId!).order('serial_number'),
      supabase.from('extra_scarves').select('*').eq('order_id', orderId!).order('serial_number'),
      supabase.from('extra_hats').select('*').eq('order_id', orderId!).order('serial_number'),
    ]);

    setCities((citiesRes.data as any) || []);

    const hatsSorted = ((hatsRes.data as any[]) || [])
      .sort((a, b) => {
        if (a.name === 'بدون تطريز') return -1;
        if (b.name === 'بدون تطريز') return 1;
        return String(a.name).localeCompare(String(b.name), 'ar');
      }) as HatEmbroideryOption[];
    setHatEmbroideries(hatsSorted);
    const noneId = hatsSorted.find(h => h.name === 'بدون تطريز')?.id || '';
    setNoEmbroideryId(noneId);

    const scarfs = (scarfsRes.data as any[]) || [];
    const parsedScarfs: ScarfDesign[] = scarfs.map((s: any) => ({
      id: s.id,
      sort_order: s.sort_order,
      scarf_style_name: s.scarf_styles?.name,
      date_type_name: s.date_types?.name,
      scarf_method_name: s.scarf_methods?.name,
      embroidery_direction_name: s.embroidery_directions?.name,
      font_name: s.fonts?.name,
      embroidery_color: s.embroidery_color,
    }));
    setScarfDesigns(parsedScarfs);

    const defaultScarfId = parsedScarfs[0]?.id || '';

    // Logo is "all"
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
        hasPurplePackage: s.has_purple_package || false,
        nameError: '',
        similarWarning: '',
      })));
    } else if (info.student_count > 0) {
      const initialCount = Math.min(info.student_count, 5);
      setStudents(Array.from({ length: initialCount }, (_, i) => {
        const row = createEmptyRow(i + 1, defaultScarfId, noneId);
        if (logoIsAll) row.hasLogoEmbroidery = true;
        return row;
      }));
    }

    // Extra scarves
    const existingExtraScarves = (extraScarvesRes.data as any[]) || [];
    if (existingExtraScarves.length > 0) {
      setExtraScarves(existingExtraScarves.map((s: any) => ({
        id: s.id,
        serialNumber: s.serial_number,
        name: s.name || '',
        scarfDesignId: s.scarf_design_id || defaultScarfId,
        hasLogoEmbroidery: false,
        backEmbroideryText: '',
      })));
    } else if (info.extra_scarf_count > 0) {
      setExtraScarves(Array.from({ length: info.extra_scarf_count }, (_, i) => ({
        id: crypto.randomUUID(),
        serialNumber: i + 1,
        name: '',
        scarfDesignId: defaultScarfId,
        hasLogoEmbroidery: false,
        backEmbroideryText: '',
      })));
    }

    // Extra hats
    const existingExtraHats = (extraHatsRes.data as any[]) || [];
    if (existingExtraHats.length > 0) {
      setExtraHats(existingExtraHats.map((s: any) => ({
        id: s.id,
        serialNumber: s.serial_number,
        hatEmbroideryId: s.hat_embroidery_id || noneId,
        hatExtraText: s.hat_extra_text || '',
        fringeColor: s.fringe_color || '',
      })));
    } else if (info.extra_hat_count > 0) {
      setExtraHats(Array.from({ length: info.extra_hat_count }, (_, i) => ({
        id: crypto.randomUUID(),
        serialNumber: i + 1,
        hatEmbroideryId: noneId,
        hatExtraText: '',
        fringeColor: '',
      })));
    }

    setLoading(false);
  };

  const logoIsAll = orderInfo && orderInfo.logo_embroidery_enabled && (orderInfo.logo_embroidery_count === 0 || orderInfo.logo_embroidery_count >= maxStudents);

  const logoCount = useMemo(() => students.filter(s => s.hasLogoEmbroidery).length + extraScarves.filter(s => s.hasLogoEmbroidery).length, [students, extraScarves]);
  const backCount = useMemo(() => students.filter(s => s.backEmbroideryText.trim()).length + extraScarves.filter(s => s.backEmbroideryText.trim()).length, [students, extraScarves]);

  // Hat embroidery quota: total across students + extra hats
  const studentHatCount = useMemo(() => students.filter(s => s.hatEmbroideryId && s.hatEmbroideryId !== noEmbroideryId).length, [students, noEmbroideryId]);
  const extraHatEmbCount = useMemo(() => extraHats.filter(h => h.hatEmbroideryId && h.hatEmbroideryId !== noEmbroideryId).length, [extraHats, noEmbroideryId]);
  const totalHatQuotaUsed = studentHatCount + extraHatEmbCount;
  const totalHatQuota = orderInfo?.hat_embroidery_count || 0;

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

  const addRows = useCallback((count: number) => {
    const defaultScarfId = scarfDesigns[0]?.id || '';
    setStudents(prev => {
      const remaining = maxStudents - prev.length;
      if (remaining <= 0) {
        toast({ title: `لا يمكن إضافة أكثر من ${maxStudents} صف`, variant: 'destructive' });
        return prev;
      }
      const toAdd = Math.min(count, remaining);
      const newRows = Array.from({ length: toAdd }, (_, i) => {
        const row = createEmptyRow(prev.length + i + 1, defaultScarfId, noEmbroideryId);
        if (logoIsAll) row.hasLogoEmbroidery = true;
        return row;
      });
      return [...prev, ...newRows];
    });
  }, [scarfDesigns, logoIsAll, noEmbroideryId, maxStudents, toast]);

  const addRow = useCallback(() => addRows(1), [addRows]);
  const addFiveRows = useCallback(() => addRows(5), [addRows]);
  const addAllRows = useCallback(() => addRows(maxStudents), [addRows, maxStudents]);

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

  const togglePurple = useCallback((id: string) => {
    setStudents(prev => {
      const student = prev.find(s => s.id === id);
      if (!student) return prev;
      const currentCount = prev.filter(s => s.hasPurplePackage).length;
      if (!student.hasPurplePackage && orderInfo && orderInfo.purple_package_count > 0 && currentCount >= orderInfo.purple_package_count) {
        toast({ title: 'تم الوصول للحد الأقصى لبكج Purple', variant: 'destructive' });
        return prev;
      }
      return prev.map(s => s.id === id ? { ...s, hasPurplePackage: !s.hasPurplePackage } : s);
    });
  }, [orderInfo, toast]);

  const updateShipping = (field: keyof ShippingInfo, value: string) => {
    setShipping(prev => ({ ...prev, [field]: value }));
  };

  const validateAll = (): string[] => {
    const errors: string[] = [];
    
    if (maxStudents > 0) {
      const filledStudents = students.filter(s => s.name.trim());
      if (filledStudents.length === 0) {
        errors.push('يجب إدخال بيانات طالبة واحدة على الأقل');
      }
      filledStudents.forEach((s) => {
        if (!s.size) errors.push(`الطالبة رقم ${s.serialNumber} ينقصها اختيار المقاس`);
        if (s.nameError) errors.push(`الطالبة رقم ${s.serialNumber}: ${s.nameError}`);
        const hat = hatEmbroideries.find(h => h.id === s.hatEmbroideryId);
        const isNone = !s.hatEmbroideryId || s.hatEmbroideryId === noEmbroideryId || hat?.name === 'بدون تطريز';
        if (!isNone && hat?.has_extra_text && s.hatExtraText.trim()) {
          if (/\s/.test(s.hatExtraText.trim())) {
            errors.push(`الطالبة رقم ${s.serialNumber}: نص تطريز القبعة يجب أن يكون كلمة واحدة بدون مسافات`);
          } else if (s.hatExtraText.trim().length > 10) {
            errors.push(`الطالبة رقم ${s.serialNumber}: نص تطريز القبعة يجب ألا يتجاوز 10 أحرف`);
          }
        }
      });
    }

    // Logo quota validation
    if (orderInfo?.logo_embroidery_enabled && orderInfo.logo_embroidery_count > 0) {
      if (logoCount !== orderInfo.logo_embroidery_count) {
        errors.push(`يجب استهلاك كامل رصيد تطريز الشعار (${logoCount} / ${orderInfo.logo_embroidery_count})`);
      }
    }

    // Back embroidery quota validation
    if (orderInfo?.back_embroidery_enabled && orderInfo.back_embroidery_count > 0) {
      if (backCount !== orderInfo.back_embroidery_count) {
        errors.push(`يجب استهلاك كامل رصيد التطريز الخلفي (${backCount} / ${orderInfo.back_embroidery_count})`);
      }
    }

    // Extra scarves validation
    const extraScarfCount = orderInfo?.extra_scarf_count || 0;
    if (extraScarfCount > 0) {
      extraScarves.forEach((es) => {
        if (!es.name.trim()) {
          errors.push(`وشاح إضافي رقم ${es.serialNumber} ينقصه الاسم`);
        } else {
          const { error } = validateName(es.name);
          if (error) errors.push(`وشاح إضافي رقم ${es.serialNumber}: ${error}`);
        }
      });
    }

    // Extra hats validation
    const extraHatCount = orderInfo?.extra_hat_count || 0;
    if (extraHatCount > 0) {
      extraHats.forEach((eh) => {
        const hat = hatEmbroideries.find(h => h.id === eh.hatEmbroideryId);
        const isNone = !eh.hatEmbroideryId || eh.hatEmbroideryId === noEmbroideryId || hat?.name === 'بدون تطريز';
        if (!isNone && hat?.has_extra_text && eh.hatExtraText.trim()) {
          if (/\s/.test(eh.hatExtraText.trim())) {
            errors.push(`قبعة إضافية رقم ${eh.serialNumber}: نص التطريز يجب أن يكون كلمة واحدة بدون مسافات`);
          } else if (eh.hatExtraText.trim().length > 10) {
            errors.push(`قبعة إضافية رقم ${eh.serialNumber}: نص التطريز يجب ألا يتجاوز 10 أحرف`);
          }
        }
        if (!eh.fringeColor) {
          errors.push(`قبعة إضافية رقم ${eh.serialNumber} ينقصها لون الهدب`);
        }
      });
    }

    // Hat embroidery quota validation (optional - only validate if quota set and used)
    if (orderInfo?.hat_embroidery_enabled && totalHatQuota > 0) {
      if (totalHatQuotaUsed > totalHatQuota) {
        errors.push(`تم تجاوز رصيد تطريز القبعات (${totalHatQuotaUsed} / ${totalHatQuota})`);
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

  const saveStudentsAndShipping = async (): Promise<boolean> => {
    if (!orderId) return false;

    // Delete existing students and insert new ones
    const { error: deleteError } = await supabase.from('students').delete().eq('order_id', orderId);
    if (deleteError) {
      toast({ title: 'خطأ في حذف البيانات القديمة', description: deleteError.message, variant: 'destructive' });
      return false;
    }

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
        has_purple_package: s.hasPurplePackage,
        extra_services: [],
      };
    });

    if (rows.length > 0) {
      const { error: studentsError } = await supabase.from('students').insert(rows as any);
      if (studentsError) {
        toast({ title: 'خطأ في حفظ بيانات الطالبات', description: studentsError.message, variant: 'destructive' });
        return false;
      }
    }

    // Save extra scarves
    await supabase.from('extra_scarves').delete().eq('order_id', orderId);
    if (extraScarves.length > 0) {
      const scarfRows = extraScarves.map(es => ({
        order_id: orderId,
        serial_number: es.serialNumber,
        name: es.name.trim(),
        scarf_design_id: es.scarfDesignId || null,
      }));
      const { error: eErr } = await supabase.from('extra_scarves').insert(scarfRows as any);
      if (eErr) {
        toast({ title: 'خطأ في حفظ الأوشحة الإضافية', description: eErr.message, variant: 'destructive' });
        return false;
      }
    }

    // Save extra hats
    await supabase.from('extra_hats').delete().eq('order_id', orderId);
    if (extraHats.length > 0) {
      const hatRows = extraHats.map(eh => {
        const hat = hatEmbroideries.find(h => h.id === eh.hatEmbroideryId);
        const isNone = !eh.hatEmbroideryId || eh.hatEmbroideryId === noEmbroideryId || hat?.name === 'بدون تطريز';
        return {
          order_id: orderId,
          serial_number: eh.serialNumber,
          hat_embroidery_id: isNone ? null : eh.hatEmbroideryId,
          hat_extra_text: !isNone ? (eh.hatExtraText.trim() || null) : null,
          fringe_color: eh.fringeColor || null,
        };
      });
      const { error: ehErr } = await supabase.from('extra_hats').insert(hatRows as any);
      if (ehErr) {
        toast({ title: 'خطأ في حفظ القبعات الإضافية', description: ehErr.message, variant: 'destructive' });
        return false;
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
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!orderId) return;
    setSaving(true);
    setValidationErrors([]);
    const ok = await saveStudentsAndShipping();
    if (ok) {
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

    const saveOk = await saveStudentsAndShipping();
    if (!saveOk) {
      setSubmitting(false);
      return;
    }

    const { error } = await supabase
      .from('orders')
      .update({ data_submitted: true, status: 'under_review' as any })
      .eq('id', orderId);

    if (error) {
      toast({ title: 'خطأ في إرسال البيانات', description: error.message, variant: 'destructive' });
      setSubmitting(false);
    } else {
      toast({ title: 'تم إرسال البيانات بنجاح ✓' });
      setTimeout(() => window.location.reload(), 500);
    }
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

  // Lock page when data is submitted or status is not pending_data
  const isLocked = orderInfo && (orderInfo.data_submitted || orderInfo.status !== 'pending_data');

  const generatePDF = async () => {
    if (!orderId) return;
    const { data: studentsData } = await supabase.from('students').select('*').eq('order_id', orderId).order('serial_number');
    const rows = studentsData || [];

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(16);
    doc.text(`Order: ${orderInfo?.order_number || ''}`, 105, 20, { align: 'center' });
    doc.setFontSize(11);
    doc.text(`Leader: ${orderInfo?.leader_name || ''}`, 105, 30, { align: 'center' });
    doc.text(`Students: ${rows.length} / ${orderInfo?.student_count || 0}`, 105, 38, { align: 'center' });

    let y = 50;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('#', 190, y, { align: 'right' });
    doc.text('Name', 170, y, { align: 'right' });
    doc.text('Size', 100, y, { align: 'right' });
    doc.text('Logo', 70, y, { align: 'right' });
    doc.text('Purple', 40, y, { align: 'right' });
    y += 2;
    doc.line(15, y, 195, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    rows.forEach((s: any, i: number) => {
      if (y > 280) { doc.addPage(); y = 20; }
      doc.text(String(s.serial_number || i + 1), 190, y, { align: 'right' });
      doc.text(s.name || '', 170, y, { align: 'right' });
      doc.text(s.size || '-', 100, y, { align: 'right' });
      doc.text(s.has_logo_embroidery ? 'Yes' : 'No', 70, y, { align: 'right' });
      doc.text(s.has_purple_package ? 'Yes' : 'No', 40, y, { align: 'right' });
      y += 6;
    });

    doc.save(`order-${orderInfo?.order_number || orderId}.pdf`);
  };

  if (isLocked) {
    const isInProgress = orderInfo?.status === 'in_progress';
    const isCompleted = orderInfo?.status === 'completed';

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-5">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              {isInProgress || isCompleted ? (
                <Truck className="h-7 w-7 text-primary" />
              ) : (
                <Send className="h-7 w-7 text-primary" />
              )}
            </div>

            <h2 className="text-lg font-bold text-foreground">تم إرسال البيانات بنجاح</h2>
            <p className="text-sm text-muted-foreground">يمكنكم تحميل ملخص الطلب من الزر أدناه</p>

            <Button onClick={generatePDF} className="gap-2">
              <Download className="h-4 w-4" />
              تحميل ملخص الطلب PDF
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const showLogo = orderInfo?.logo_embroidery_enabled;
  const showBack = orderInfo?.back_embroidery_enabled;
  const showHat = orderInfo?.hat_embroidery_enabled;
  const showPurple = orderInfo?.purple_package_enabled;
  const isSubmitted = orderInfo?.data_submitted;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-card border-b border-border shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-foreground">إدخال بيانات الطالبات</h1>
            <img src="/logo.svg" alt="متجر Areba" className="h-8 object-contain" />
          </div>
          <div className="flex items-center gap-3 mt-2 text-sm flex-wrap">
            {maxStudents > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Users className="h-3 w-3" />
                الطالبات: {students.filter(s => s.name.trim()).length} / {maxStudents}
              </Badge>
            )}
            {(orderInfo?.extra_scarf_count || 0) > 0 && (
              <Badge variant="outline" className="gap-1">أوشحة إضافية: {orderInfo!.extra_scarf_count}</Badge>
            )}
            {(orderInfo?.extra_hat_count || 0) > 0 && (
              <Badge variant="outline" className="gap-1">قبعات إضافية: {orderInfo!.extra_hat_count}</Badge>
            )}
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
                رصيد تطريز القبعات: {totalHatQuotaUsed} / {totalHatQuota || 'الكل'}
              </Badge>
            )}
            {showPurple && (
              <Badge variant="outline" className="gap-1">
                بكج Purple: {students.filter(s => s.hasPurplePackage).length} / {orderInfo!.purple_package_count || 'الكل'}
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

      {/* Order Details Accordion */}
      {orderInfo && (
        <div className="pt-3 w-[90%] mx-auto">
          <Collapsible>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between p-4 rounded-xl border border-border bg-card shadow-sm hover:bg-accent/5 transition-colors">
                <span className="text-sm font-medium text-foreground">بيانات الطلب</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 p-4 rounded-xl border border-border bg-card shadow-sm space-y-4">
                {(() => {
                  const isKit = orderInfo.order_type === 'ready_kit';
                  const abayaColor = isKit ? orderInfo.kit_abaya_color : orderInfo.custom_abaya_color;
                  const abayaDegree = isKit ? orderInfo.kit_abaya_color_degree : orderInfo.custom_abaya_color_degree;
                  const scarfColor = isKit ? orderInfo.kit_scarf_color : orderInfo.custom_scarf_color;
                  const scarfDegree = isKit ? orderInfo.kit_scarf_color_degree : orderInfo.custom_scarf_color_degree;
                  const hatColor = isKit ? orderInfo.kit_hat_color : orderInfo.custom_hat_color;
                  const hatDegree = isKit ? orderInfo.kit_hat_color_degree : orderInfo.custom_hat_color_degree;

                  const DataCell = ({ label, value }: { label: string; value: string }) => (
                    <div className="space-y-0.5">
                      <p className="text-[11px] text-muted-foreground">{label}</p>
                      <p className="text-sm font-medium text-foreground">{value || '---'}</p>
                    </div>
                  );

                  const ColorCell = ({ label, color, degree }: { label: string; color: string; degree: string }) => {
                    if (!color && !degree) return null;
                    const display = [color, degree].filter(Boolean).join(' - ');
                    return (
                      <div className="space-y-0.5">
                        <p className="text-[11px] text-muted-foreground">{label}</p>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-full border border-border bg-muted" />
                          <p className="text-sm font-medium text-foreground">{display}</p>
                        </div>
                      </div>
                    );
                  };

                  return (
                    <>
                      <div className="grid grid-cols-2 gap-4 pb-3 border-b border-border">
                        {orderInfo.leader_name && <DataCell label="اسم القائدة" value={orderInfo.leader_name} />}
                        <DataCell label="رقم الطلب" value={orderInfo.order_number} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <DataCell label="نوع الطلب" value={isKit ? 'طقم جاهز' : 'تفصيل جديد'} />
                        {isKit && orderInfo.kit_name && <DataCell label="اسم الطقم" value={orderInfo.kit_name} />}
                        <DataCell label="شكل العباية" value={orderInfo.abaya_design_name} />
                        <DataCell label="طرف الكم" value={orderInfo.sleeve_style_name} />
                        {orderInfo.sleeve_color && <DataCell label="لون طرف الكم" value={orderInfo.sleeve_color} />}
                      </div>
                      {(abayaColor || scarfColor || hatColor) && (
                        <div className="border-t border-border pt-3">
                          <p className="text-xs font-semibold text-muted-foreground mb-2">الألوان</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            <ColorCell label="لون العباية" color={abayaColor} degree={abayaDegree} />
                            <ColorCell label="لون الوشاح" color={scarfColor} degree={scarfDegree} />
                            <ColorCell label="لون القبعة" color={hatColor} degree={hatDegree} />
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      {/* Scarf Designs Accordion */}
      {scarfDesigns.length > 0 && (
        <div className="pt-3 w-[90%] mx-auto">
          <Collapsible>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between p-4 rounded-xl border border-border bg-card shadow-sm hover:bg-accent/5 transition-colors">
                <span className="text-sm font-medium text-foreground">استعراض بيانات الأوشحة</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 p-4 rounded-xl border border-border bg-card shadow-sm">
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
        </div>
      )}

      {/* Students Table Accordion */}
      {maxStudents > 0 && (
      <div className="pt-3 w-[90%] mx-auto">
        <Collapsible>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between p-4 rounded-xl border border-border bg-card shadow-sm hover:bg-accent/5 transition-colors">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Users className="h-4 w-4 text-primary" />
                بيانات الخريجات
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <div className="min-w-[700px] max-h-[calc(100vh-400px)] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-20 bg-card border-b border-border">
                      <tr>
                        <th className="w-12 px-2 py-3 text-center font-semibold text-muted-foreground">#</th>
                        <th className="w-[200px] px-2 py-3 text-right font-semibold text-muted-foreground">اسم الطالبة</th>
                        <th className="w-[160px] px-2 py-3 text-center font-semibold text-muted-foreground">المقاس</th>
                        <th className="w-[120px] px-2 py-3 text-center font-semibold text-muted-foreground">الوشاح</th>
                        {showHat && <th className="w-[120px] px-2 py-3 text-center font-semibold text-muted-foreground">القبعة</th>}
                        {showLogo && <th className="w-[70px] px-2 py-3 text-center font-semibold text-muted-foreground">شعار</th>}
                        {showBack && <th className="w-[140px] px-2 py-3 text-center font-semibold text-muted-foreground">تطريز خلفي</th>}
                        {showPurple && <th className="w-[70px] px-2 py-3 text-center font-semibold text-muted-foreground">بكج Purple</th>}
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
                              disabled={!!isSubmitted}
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
                                  disabled={!!isSubmitted}
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
                                disabled={!!isSubmitted}
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
                          {showHat && (
                          <td className="px-2 py-2.5">
                            <div className="flex items-center justify-center gap-1">
                              <Select
                                value={student.hatEmbroideryId}
                                onValueChange={(v) => {
                                  const hat = hatEmbroideries.find(h => h.id === v);
                                  const isNone = !v || v === noEmbroideryId || hat?.name === 'بدون تطريز';

                                  if (!isNone) {
                                    const currentStudentHats = students.filter(s => s.id !== student.id && s.hatEmbroideryId && s.hatEmbroideryId !== noEmbroideryId).length;
                                    const totalUsed = currentStudentHats + extraHatEmbCount;
                                    if (totalHatQuota > 0 && totalUsed >= totalHatQuota) {
                                      toast({ title: 'تم الوصول للحد الأقصى لتطريز القبعات', variant: 'destructive' });
                                      return;
                                    }
                                  }

                                  updateStudent(student.id, 'hatEmbroideryId', v);
                                  if (isNone) updateStudent(student.id, 'hatExtraText', '');
                                }}
                                disabled={!!isSubmitted}
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
                                    disabled={!!isSubmitted}
                                  />
                                );
                              })()}
                            </div>
                          </td>
                          )}
                          {showLogo && (
                            <td className="px-2 py-2.5 text-center">
                              <Checkbox
                                checked={student.hasLogoEmbroidery}
                                onCheckedChange={() => toggleLogo(student.id)}
                                disabled={!!logoIsAll || !!isSubmitted}
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
                                disabled={!!isSubmitted}
                              />
                            </td>
                          )}
                          {showPurple && (
                            <td className="px-2 py-2.5 text-center">
                              <Checkbox
                                checked={student.hasPurplePackage}
                                onCheckedChange={() => togglePurple(student.id)}
                                disabled={!!isSubmitted}
                              />
                            </td>
                          )}
                          <td className="px-2 py-2.5 text-center">
                            <button
                              onClick={() => removeRow(student.id)}
                              disabled={!!isSubmitted}
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

              {/* Add Rows Buttons */}
              {!isSubmitted && students.length < maxStudents && (
                <div className="p-3 border-t border-border flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={addRow} className="gap-1">
                    <Plus className="h-3.5 w-3.5" /> إضافة صف
                  </Button>
                  <Button variant="outline" size="sm" onClick={addFiveRows} className="gap-1">
                    <Plus className="h-3.5 w-3.5" /> إضافة 5 صفوف
                  </Button>
                  <Button variant="outline" size="sm" onClick={addAllRows} className="gap-1">
                    <Plus className="h-3.5 w-3.5" /> إضافة جميع الصفوف
                  </Button>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
      )}

      {/* Extra Scarves Section */}
      {(orderInfo?.extra_scarf_count || 0) > 0 && (
        <div className="pt-3 w-[90%] mx-auto">
          <Collapsible>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between p-4 rounded-xl border border-border bg-card shadow-sm hover:bg-accent/5 transition-colors">
                <span className="text-sm font-medium text-foreground">الأوشحة الإضافية ({extraScarves.length})</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-card border-b border-border">
                      <tr>
                        <th className="w-12 px-2 py-3 text-center font-semibold text-muted-foreground">#</th>
                        <th className="px-2 py-3 text-right font-semibold text-muted-foreground">الاسم</th>
                        <th className="w-[150px] px-2 py-3 text-center font-semibold text-muted-foreground">نوع الوشاح</th>
                        {showLogo && <th className="w-[70px] px-2 py-3 text-center font-semibold text-muted-foreground">شعار</th>}
                        {showBack && <th className="w-[140px] px-2 py-3 text-center font-semibold text-muted-foreground">تطريز خلفي</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {extraScarves.map((es) => (
                        <tr key={es.id} className="border-b border-border/50">
                          <td className="px-2 py-3 text-center text-xs font-bold text-muted-foreground">{es.serialNumber}</td>
                          <td className="px-2 py-2.5">
                            <Input
                              value={es.name}
                              onChange={e => setExtraScarves(prev => prev.map(s => s.id === es.id ? { ...s, name: e.target.value } : s))}
                              placeholder="اسم صاحب/ة الوشاح"
                              className="h-9 text-xs"
                              disabled={!!isSubmitted}
                            />
                          </td>
                          <td className="px-2 py-2.5">
                            {scarfDesigns.length > 0 ? (
                              <Select
                                value={es.scarfDesignId}
                                onValueChange={v => setExtraScarves(prev => prev.map(s => s.id === es.id ? { ...s, scarfDesignId: v } : s))}
                                disabled={!!isSubmitted}
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
                          {showLogo && (
                            <td className="px-2 py-2.5 text-center">
                              <Checkbox
                                checked={es.hasLogoEmbroidery}
                                onCheckedChange={() => {
                                  if (logoIsAll) return;
                                  setExtraScarves(prev => {
                                    const current = prev.find(s => s.id === es.id);
                                    if (!current) return prev;
                                    if (!current.hasLogoEmbroidery && orderInfo && orderInfo.logo_embroidery_count > 0 && logoCount >= orderInfo.logo_embroidery_count) return prev;
                                    return prev.map(s => s.id === es.id ? { ...s, hasLogoEmbroidery: !s.hasLogoEmbroidery } : s);
                                  });
                                }}
                                disabled={!!logoIsAll || !!isSubmitted}
                              />
                            </td>
                          )}
                          {showBack && (
                            <td className="px-2 py-2.5">
                              <Input
                                value={es.backEmbroideryText}
                                onChange={e => {
                                  if (!es.backEmbroideryText.trim() && e.target.value.trim()) {
                                    if (orderInfo && orderInfo.back_embroidery_count > 0 && backCount >= orderInfo.back_embroidery_count) return;
                                  }
                                  setExtraScarves(prev => prev.map(s => s.id === es.id ? { ...s, backEmbroideryText: e.target.value } : s));
                                }}
                                placeholder="النص"
                                className="h-8 text-xs"
                                disabled={!!isSubmitted}
                              />
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      {/* Extra Hats Section */}
      {(orderInfo?.extra_hat_count || 0) > 0 && (
        <div className="pt-3 w-[90%] mx-auto">
          <Collapsible>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between p-4 rounded-xl border border-border bg-card shadow-sm hover:bg-accent/5 transition-colors">
                <span className="text-sm font-medium text-foreground">القبعات الإضافية ({extraHats.length})</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 flex justify-end">
                <div className="w-fit max-w-[500px] rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                  <table className="text-sm">
                    <thead className="bg-card border-b border-border">
                      <tr>
                        <th className="w-10 px-2 py-2 text-center font-semibold text-muted-foreground text-xs">#</th>
                        <th className="w-[140px] px-2 py-2 text-center font-semibold text-muted-foreground text-xs">تصميم التطريز</th>
                        <th className="w-[110px] px-2 py-2 text-center font-semibold text-muted-foreground text-xs">نص التطريز</th>
                        <th className="w-[100px] px-2 py-2 text-center font-semibold text-muted-foreground text-xs">لون الهدب</th>
                      </tr>
                    </thead>
                    <tbody>
                      {extraHats.map((eh) => {
                        const hat = hatEmbroideries.find(h => h.id === eh.hatEmbroideryId);
                        const isNone = !eh.hatEmbroideryId || eh.hatEmbroideryId === noEmbroideryId || hat?.name === 'بدون تطريز';
                        return (
                          <tr key={eh.id} className="border-b border-border/50">
                            <td className="px-2 py-2 text-center text-xs font-bold text-muted-foreground">{eh.serialNumber}</td>
                            <td className="px-2 py-1.5">
                              <Select
                                value={eh.hatEmbroideryId}
                                onValueChange={(v) => {
                                  const newHat = hatEmbroideries.find(h => h.id === v);
                                  const newIsNone = !v || v === noEmbroideryId || newHat?.name === 'بدون تطريز';
                                  if (!newIsNone && !isNone) {
                                    // Swapping - ok
                                  } else if (!newIsNone) {
                                    const currentUsed = totalHatQuotaUsed;
                                    if (totalHatQuota > 0 && currentUsed >= totalHatQuota) {
                                      toast({ title: 'تم الوصول للحد الأقصى لتطريز القبعات', variant: 'destructive' });
                                      return;
                                    }
                                  }
                                  setExtraHats(prev => prev.map(h => h.id === eh.id ? { ...h, hatEmbroideryId: v, hatExtraText: newIsNone ? '' : h.hatExtraText } : h));
                                }}
                                disabled={!!isSubmitted}
                              >
                                <SelectTrigger className="h-7 text-xs">
                                  <SelectValue placeholder="بدون تطريز" />
                                </SelectTrigger>
                                <SelectContent>
                                  {hatEmbroideries.map(h => (
                                    <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-2 py-1.5">
                              {!isNone && hat?.has_extra_text ? (
                                <Input
                                  value={eh.hatExtraText}
                                  onChange={e => setExtraHats(prev => prev.map(h => h.id === eh.id ? { ...h, hatExtraText: e.target.value } : h))}
                                  placeholder="اختياري"
                                  maxLength={10}
                                  className="h-7 text-xs"
                                  disabled={!!isSubmitted}
                                />
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-2 py-1.5">
                              <Select
                                value={eh.fringeColor}
                                onValueChange={v => setExtraHats(prev => prev.map(h => h.id === eh.id ? { ...h, fringeColor: v } : h))}
                                disabled={!!isSubmitted}
                              >
                                <SelectTrigger className="h-7 text-xs">
                                  <SelectValue placeholder="اختر" />
                                </SelectTrigger>
                                <SelectContent>
                                  {FRINGE_COLORS.map(c => (
                                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      {/* Shipping Section */}
      <div className="pt-4 pb-28 w-[90%] mx-auto">
        <Collapsible open={shippingOpen} onOpenChange={setShippingOpen}>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between p-4 rounded-xl border border-border bg-card shadow-sm hover:bg-accent/5 transition-colors">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Truck className="h-4 w-4 text-primary" />
                بيانات الشحن
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${shippingOpen ? 'rotate-180' : ''}`} />
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="mt-2 p-5 rounded-xl border border-border bg-card shadow-sm">
              <div className="w-[75%] mx-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">اسم المستلم *</label>
                    <Input value={shipping.recipient_name} onChange={e => updateShipping('recipient_name', e.target.value)} placeholder="اسم المستلم" className="h-9 text-xs" disabled={!!isSubmitted} />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">رقم الجوال *</label>
                    <Input value={shipping.recipient_phone} onChange={e => updateShipping('recipient_phone', e.target.value)} placeholder="05XXXXXXXX" className="h-9 text-xs" disabled={!!isSubmitted} />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">المدينة *</label>
                    <Popover open={citySearchOpen} onOpenChange={setCitySearchOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={citySearchOpen}
                          className="w-full justify-between font-normal h-9 text-xs"
                          disabled={!!isSubmitted}
                        >
                          {shipping.shipping_city_id ? cities.find(c => c.id === shipping.shipping_city_id)?.name || 'اختر المدينة' : 'اختر المدينة'}
                          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder="ابحث عن مدينة..." />
                          <CommandList>
                            <CommandEmpty>لا توجد نتائج</CommandEmpty>
                            <CommandGroup>
                              {cities.map(c => (
                                <CommandItem
                                  key={c.id}
                                  value={c.name}
                                  onSelect={() => {
                                    updateShipping('shipping_city_id', c.id);
                                    setCitySearchOpen(false);
                                  }}
                                >
                                  <Check className={cn("ml-2 h-4 w-4", shipping.shipping_city_id === c.id ? "opacity-100" : "opacity-0")} />
                                  {c.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">الحي *</label>
                    <Input value={shipping.district} onChange={e => updateShipping('district', e.target.value)} placeholder="اسم الحي" className="h-9 text-xs" disabled={!!isSubmitted} />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">تفاصيل العنوان *</label>
                    <Input value={shipping.address_details} onChange={e => updateShipping('address_details', e.target.value)} placeholder="الشارع، رقم المبنى..." className="h-9 text-xs" disabled={!!isSubmitted} />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">العنوان الوطني (اختياري)</label>
                    <Input value={shipping.national_address} onChange={e => updateShipping('national_address', e.target.value)} placeholder="العنوان الوطني" className="h-9 text-xs" disabled={!!isSubmitted} />
                  </div>
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
