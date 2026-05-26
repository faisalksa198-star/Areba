import { supabase } from '@/integrations/supabase/client';

export interface ReportStudentRow {
  serial: string;
  name: string;
  size: string;
  scarfNum: string;
  hatDesignNum: string;
  hatExtraText: string;
  backText: string;
  hasLogo: boolean;
}
export interface ReportScarfDesign {
  index: number;
  styleName?: string;
  methodName?: string;
  embroideryDirection?: string;
  dateName?: string;
  fontName?: string;
  embroideryColor?: string;
  styleImage?: string;
  dateImage?: string;
}
export interface ReportHatGroup {
  index: number;
  name: string;
  image?: string;
  count: number;
  fringes: string[];
  hasEmbroidery: boolean;
  hasExtraText: boolean;
  customText?: string;
}
export interface ReportData {
  orderNumber: string;
  createdAt: string;
  orderDateFormatted: string;
  status?: string;
  statusLabel: string;
  leaderName?: string;
  schoolName?: string;
  orderTypeLabel: string;
  kitName?: string;
  studentCount?: number;
  extraScarfCount?: number;
  extraHatCount?: number;
  includesSets: boolean;
  includesScarves: boolean;
  includesHats: boolean;
  setQuantity: number;
  scarfQuantity: number;
  hatQuantity: number;
  executionDuration?: number;
  abayaColor?: string;
  abayaLength?: string;
  abayaDesignName?: string;
  abayaDesignImage?: string;
  sleeveStyleName?: string;
  sleeveStyleImage?: string;
  sleeveColor?: string;
  scarfColor?: string;
  hatColor?: string;
  mainHatFringeColor?: string;
  logoEmbroideryCount?: number;
  backEmbroideryCount?: number;
  hatEmbroideryCount?: number;
  scarves: ReportScarfDesign[];
  hats: ReportHatGroup[];
  students: ReportStudentRow[];
  hasBackCol: boolean;
  hasLogoCol: boolean;
  hasHatTextCol: boolean;
  recipientName?: string;
  recipientPhone?: string;
  shippingCity?: string;
  cityName?: string;
  district?: string;
  addressDetails?: string;
  nationalAddress?: string;
}

const statusLabels: Record<string, string> = {
  pending_data: 'بانتظار البيانات',
  under_review: 'قيد المراجعة',
  in_progress: 'قيد التنفيذ',
  shipped: 'تم الشحن',
  completed: 'مكتمل',
  cancelled: 'ملغي',
};

function formatReportDate(value?: string | null) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year} / ${month} / ${day}`;
}

export async function loadOrderReportData(orderId: string): Promise<ReportData> {
  const [orderRes, studentsRes, scarfDesignsRes, extraScarvesRes, extraHatsRes] = await Promise.all([
    supabase.from('orders').select(`
      *,
      abaya_designs:abaya_design_id(name, image_url),
      sleeve_styles:sleeve_style_id(name, image_url),
      ready_kits:kit_id(name, abaya_color, abaya_color_degree, scarf_color, scarf_color_degree, hat_color, hat_color_degree, sleeve_color,
        abaya_designs:abaya_design_id(name, image_url),
        sleeve_styles:sleeve_style_id(name, image_url)
      )
    `).eq('id', orderId).single(),
    supabase.from('students').select('*, hat_embroideries:hat_embroidery_id(name, image_url, has_extra_text)').eq('order_id', orderId).order('serial_number'),
    supabase.from('order_scarf_designs').select(`
      *, scarf_styles:scarf_style_id(name, image_url),
      scarf_methods:scarf_method_id(name, image_url),
      embroidery_directions:embroidery_direction_id(name, image_url),
      date_types:date_type_id(name, image_url),
      fonts:font_id(name)
    `).eq('order_id', orderId).order('sort_order'),
    supabase.from('extra_scarves').select('*').eq('order_id', orderId).order('serial_number'),
    supabase.from('extra_hats').select('*, hat_embroideries:hat_embroidery_id(name, image_url, has_extra_text)').eq('order_id', orderId).order('serial_number'),
  ]);

  const order: any = orderRes.data;
  if (!order) throw new Error('Order not found');

  const students = (studentsRes.data || []) as any[];
  const scarfDesigns = (scarfDesignsRes.data || []) as any[];
  const extraScarves = (extraScarvesRes.data || []) as any[];
  const extraHats = (extraHatsRes.data || []) as any[];

  const isKit = order.order_type === 'ready_kit';
  const kit = isKit ? order.ready_kits : null;
  const abayaColor = isKit ? kit?.abaya_color : order.custom_abaya_color;
  const scarfColor = isKit ? kit?.scarf_color : order.custom_scarf_color;
  const hatColor = isKit ? kit?.hat_color : order.custom_hat_color;
  const sleeveColor = isKit ? (kit?.sleeve_color || '') : (order.sleeve_color || '');
  const abayaDesign = isKit ? kit?.abaya_designs : order.abaya_designs;
  const sleeveStyle = isKit ? kit?.sleeve_styles : order.sleeve_styles;
  const studentCount = order.student_count || 0;
  const extraScarfCount = order.extra_scarf_count || 0;
  const extraHatCount = order.extra_hat_count || 0;

  let shippingCityName = '';
  if (order.shipping_city_id) {
    const { data: cityData } = await supabase.from('cities').select('name').eq('id', order.shipping_city_id).single();
    shippingCityName = cityData?.name || '';
  }

  const scarves: ReportScarfDesign[] = [];
  const scarfCodeMap = new Map<string, number>();
  scarfDesigns.forEach((sd, i) => {
    scarfCodeMap.set(sd.id, i + 1);
    scarves.push({
      index: i + 1,
      styleName: sd.scarf_styles?.name,
      methodName: sd.scarf_methods?.name,
      embroideryDirection: sd.embroidery_directions?.name,
      dateName: sd.date_types?.name,
      fontName: sd.fonts?.name,
      embroideryColor: sd.embroidery_color,
      styleImage: sd.scarf_styles?.image_url || '',
      dateImage: sd.date_types?.image_url || '',
    });
  });

  const includesSets = studentCount > 0 && order.order_type !== 'scarf_only' && order.order_type !== 'hat_only';
  const setQuantity = includesSets ? studentCount : 0;
  const scarfQuantity = order.order_type === 'scarf_only' ? studentCount : extraScarfCount;
  const hatQuantity = order.order_type === 'hat_only' ? studentCount : extraHatCount;
  const includesScarves = includesSets || scarfQuantity > 0;
  const includesHats = includesSets || hatQuantity > 0;

  const hatDesignMap = new Map<string, number>();
  const hatGroups: ReportHatGroup[] = [];
  const groupMap = new Map<string, number>();
  let actualHatEmbroideryCount = 0;

  const formatCustomText = (texts: string[]) => {
    const uniqueTexts = [...new Set(texts.map(text => text.trim()).filter(Boolean))];
    if (uniqueTexts.length === 0) return '';
    if (uniqueTexts.length === 1) return uniqueTexts[0];
    return `${uniqueTexts[0]} + ${uniqueTexts.length - 1} أسماء`;
  };

  const addToGroup = ({
    id,
    name,
    image,
    fringe,
    hasExtraText,
    customText,
  }: {
    id?: string | null;
    name?: string | null;
    image?: string | null;
    fringe?: string | null;
    hasExtraText?: boolean | null;
    customText?: string | null;
  }) => {
    const isNoEmbroidery = !id || !name || name === 'بدون تطريز';
    const groupKey = isNoEmbroidery ? 'none' : id || '';
    const displayName = isNoEmbroidery ? 'بدون تطريز' : name;
    const idx = groupMap.get(groupKey);

    if (!isNoEmbroidery) {
      const designId = id || '';
      actualHatEmbroideryCount++;
      if (!hatDesignMap.has(designId)) hatDesignMap.set(designId, hatDesignMap.size + 1);
    }

    if (idx !== undefined) {
      hatGroups[idx].count++;
      if (fringe && !hatGroups[idx].fringes.includes(fringe)) hatGroups[idx].fringes.push(fringe);
      if (hasExtraText && customText?.trim()) {
        const group = hatGroups[idx] as ReportHatGroup & { customTexts?: string[] };
        group.customTexts = [...(group.customTexts || []), customText];
        group.customText = formatCustomText(group.customTexts);
      }
    } else {
      const customTexts = hasExtraText && customText?.trim() ? [customText.trim()] : [];
      groupMap.set(groupKey, hatGroups.length);
      hatGroups.push({
        index: hatGroups.length + 1,
        name: displayName,
        image: isNoEmbroidery ? '' : image || '',
        count: 1,
        fringes: fringe ? [fringe] : [],
        hasEmbroidery: !isNoEmbroidery,
        hasExtraText: Boolean(hasExtraText),
        customText: formatCustomText(customTexts),
        customTexts,
      } as ReportHatGroup & { customTexts: string[] });
    }
  };
  students.forEach((s: any) => addToGroup({
    id: s.hat_embroidery_id,
    name: s.hat_embroideries?.name,
    image: s.hat_embroideries?.image_url,
    fringe: order.main_hat_fringe_color,
    hasExtraText: s.hat_embroideries?.has_extra_text,
    customText: s.hat_extra_text,
  }));
  extraHats.forEach((eh: any) => addToGroup({
    id: eh.hat_embroidery_id,
    name: eh.hat_embroideries?.name,
    image: eh.hat_embroideries?.image_url,
    fringe: eh.fringe_color,
    hasExtraText: eh.hat_embroideries?.has_extra_text,
    customText: eh.hat_extra_text,
  }));

  const hasBackCol = students.some((s: any) => s.back_embroidery_text?.trim()) || extraScarves.some((s: any) => s.back_embroidery_text?.trim());
  const hasLogoCol = students.some((s: any) => s.has_logo_embroidery) || extraScarves.some((s: any) => s.has_logo_embroidery);
  const hasHatTextCol = students.some((s: any) => {
    const hn = s.hat_embroideries?.name || '';
    return hn !== 'بدون تطريز' && s.hat_embroidery_id;
  }) || extraHats.some((h: any) => h.hat_embroidery_id && h.hat_embroideries?.name !== 'بدون تطريز');

  const rows: ReportStudentRow[] = [];
  for (const s of students) {
    const sn = s.scarf_design_id ? String(scarfCodeMap.get(s.scarf_design_id) || '') : '';
    const hn = s.hat_embroideries?.name || '';
    const isNone = hn === 'بدون تطريز' || !s.hat_embroidery_id;
    rows.push({
      serial: String(s.serial_number),
      name: s.name || '',
      size: s.size || '',
      scarfNum: sn,
      hatDesignNum: isNone ? '' : String(hatDesignMap.get(s.hat_embroidery_id) || ''),
      hatExtraText: s.hat_extra_text || '',
      backText: s.back_embroidery_text || '',
      hasLogo: s.has_logo_embroidery || false,
    });
  }
  for (const es of extraScarves) {
    const sn = es.scarf_design_id ? String(scarfCodeMap.get(es.scarf_design_id) || '') : '';
    rows.push({
      serial: `إ${es.serial_number}`, name: es.name || '', size: '',
      scarfNum: sn, hatDesignNum: '', hatExtraText: '',
      backText: es.back_embroidery_text || '', hasLogo: es.has_logo_embroidery || false,
    });
  }
  let hatIdx = 0;
  for (const eh of extraHats) {
    if (eh.hat_extra_text?.trim()) {
      hatIdx++;
      rows.push({
        serial: `ق${hatIdx}`, name: '', size: '', scarfNum: '',
        hatDesignNum: String(hatDesignMap.get(eh.hat_embroidery_id) || ''), hatExtraText: eh.hat_extra_text || '',
        backText: '', hasLogo: false,
      });
    }
  }

  return {
    orderNumber: order.order_number || '',
    createdAt: order.created_at || '',
    orderDateFormatted: formatReportDate(order.created_at),
    status: order.status,
    statusLabel: statusLabels[order.status] || order.status || '',
    leaderName: order.leader_name,
    schoolName: order.school_name,
    orderTypeLabel: isKit ? 'طقم جاهز' : 'تفصيل',
    kitName: isKit ? kit?.name : undefined,
    studentCount,
    extraScarfCount,
    extraHatCount,
    includesSets,
    includesScarves,
    includesHats,
    setQuantity,
    scarfQuantity,
    hatQuantity,
    executionDuration: order.execution_duration,
    abayaColor,
    abayaLength: order.abaya_length,
    abayaDesignName: abayaDesign?.name,
    abayaDesignImage: abayaDesign?.image_url,
    sleeveStyleName: sleeveStyle?.name,
    sleeveStyleImage: sleeveStyle?.image_url,
    sleeveColor,
    scarfColor,
    hatColor,
    mainHatFringeColor: order.main_hat_fringe_color,
    logoEmbroideryCount: order.logo_embroidery_enabled ? order.logo_embroidery_count : 0,
    backEmbroideryCount: order.back_embroidery_enabled ? order.back_embroidery_count : 0,
    hatEmbroideryCount: actualHatEmbroideryCount,
    scarves,
    hats: hatGroups,
    students: rows,
    hasBackCol,
    hasLogoCol,
    hasHatTextCol,
    recipientName: order.recipient_name,
    recipientPhone: order.recipient_phone,
    shippingCity: shippingCityName,
    cityName: shippingCityName,
    district: order.district,
    addressDetails: order.address_details,
    nationalAddress: order.national_address,
  };
}
