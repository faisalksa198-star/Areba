import { supabase } from '@/integrations/supabase/client';

interface LookupMaps {
  abayaDesigns: Map<string, string>;
  sleeveStyles: Map<string, string>;
  scarfStyles: Map<string, string>;
  scarfMethods: Map<string, string>;
  embroideryDirections: Map<string, string>;
  fonts: Map<string, string>;
  dateTypes: Map<string, string>;
  hatEmbroideries: Map<string, { name: string; has_extra_text: boolean }>;
  cities: Map<string, string>;
  kits: Map<string, string>;
}

async function loadLookupMaps(): Promise<LookupMaps> {
  const [
    abayaRes, sleeveRes, scarfStyleRes, scarfMethodRes,
    embDirRes, fontRes, dateRes, hatEmbRes, cityRes, kitRes,
  ] = await Promise.all([
    supabase.from('abaya_designs').select('id, name'),
    supabase.from('sleeve_styles').select('id, name'),
    supabase.from('scarf_styles').select('id, name'),
    supabase.from('scarf_methods').select('id, name'),
    supabase.from('embroidery_directions').select('id, name'),
    supabase.from('fonts').select('id, name'),
    supabase.from('date_types').select('id, name'),
    supabase.from('hat_embroideries').select('id, name, has_extra_text'),
    supabase.from('cities').select('id, name'),
    supabase.from('ready_kits').select('id, name'),
  ]);

  const toMap = (data: any[] | null) => new Map((data || []).map(d => [d.id, d.name]));

  return {
    abayaDesigns: toMap(abayaRes.data),
    sleeveStyles: toMap(sleeveRes.data),
    scarfStyles: toMap(scarfStyleRes.data),
    scarfMethods: toMap(scarfMethodRes.data),
    embroideryDirections: toMap(embDirRes.data),
    fonts: toMap(fontRes.data),
    dateTypes: toMap(dateRes.data),
    hatEmbroideries: new Map((hatEmbRes.data || []).map(d => [d.id, { name: d.name, has_extra_text: d.has_extra_text }])),
    cities: toMap(cityRes.data),
    kits: toMap(kitRes.data),
  };
}

function lk(map: Map<string, string>, id: string | null | undefined): string {
  if (!id) return '';
  return map.get(id) || '';
}

const STATUS_LABELS: Record<string, string> = {
  pending_data: 'بانتظار البيانات',
  under_review: 'بانتظار المراجعة',
  in_progress: 'قيد التنفيذ',
  shipped: 'تم الشحن',
  completed: 'منتهي',
  cancelled: 'ملغي',
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

function storageUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/images/${path}`;
}

// CSV headers
const HEADERS = [
  'رقم الطلب',
  'الحالة',
  'تاريخ الإنشاء',
  'تاريخ التحديث',
  'رقم الشحنة',
  'تصميم العباية',
  'نوع الكم',
  'لون الكم',
  'تصميم وشاح 1',
  'طرف وشاح 1',
  'اتجاه تطريز وشاح 1',
  'خط وشاح 1',
  'نوع تاريخ وشاح 1',
  'لون تطريز وشاح 1',
  'تصميم وشاح 2',
  'طرف وشاح 2',
  'اتجاه تطريز وشاح 2',
  'خط وشاح 2',
  'نوع تاريخ وشاح 2',
  'لون تطريز وشاح 2',
  'رابط صورة الشعار',
  'روابط صور التطريز الخلفي',
  'اسم الطالبة',
  'المقاس',
  'الوشاح',
  'القبعة',
  'تطريز الشعار',
  'الباقة البنفسجية',
  'نص تطريز الظهر',
];

function escCsv(val: string): string {
  if (val.includes('"') || val.includes(',') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return `"${val}"`;
}

export async function exportOrdersCsv(orderIds: string[]): Promise<string> {
  const [maps, ordersRes, studentsRes, scarfDesignsRes] = await Promise.all([
    loadLookupMaps(),
    supabase.from('orders').select('*').in('id', orderIds),
    supabase.from('students').select('*').in('order_id', orderIds).order('serial_number'),
    supabase.from('order_scarf_designs').select('*').in('order_id', orderIds).order('sort_order'),
  ]);

  const allOrders = ordersRes.data || [];
  const allStudents = studentsRes.data || [];
  const allScarfDesigns = scarfDesignsRes.data || [];

  const rows: string[][] = [];

  for (const order of allOrders) {
    const students = allStudents.filter(s => s.order_id === order.id);
    const scarfs = allScarfDesigns.filter(sd => sd.order_id === order.id);

    // Build scarf design map for student references
    const scarfDesignMap = new Map<string, string>();
    scarfs.forEach((sd, i) => {
      const parts: string[] = [];
      const style = lk(maps.scarfStyles, sd.scarf_style_id);
      if (style) parts.push(style);
      const method = lk(maps.scarfMethods, sd.scarf_method_id);
      if (method) parts.push(method);
      scarfDesignMap.set(sd.id, parts.length > 0 ? parts.join(' - ') : `وشاح ${i + 1}`);
    });

    // Common order-level data
    const orderNumber = order.order_number || '';
    const status = STATUS_LABELS[order.status] || order.status;
    const createdAt = order.created_at ? new Date(order.created_at).toLocaleDateString('ar-SA') : '';
    const updatedAt = order.updated_at ? new Date(order.updated_at).toLocaleDateString('ar-SA') : '';
    const trackingNumber = order.tracking_number || '';
    const abayaDesign = lk(maps.abayaDesigns, order.abaya_design_id);
    const sleeveStyle = lk(maps.sleeveStyles, order.sleeve_style_id);
    const sleeveColor = order.sleeve_color || '';

    // Scarf 1 & 2
    const s1 = scarfs[0];
    const s2 = scarfs[1];
    const scarf1Style = s1 ? lk(maps.scarfStyles, s1.scarf_style_id) : '';
    const scarf1Method = s1 ? lk(maps.scarfMethods, s1.scarf_method_id) : '';
    const scarf1EmbDir = s1 ? lk(maps.embroideryDirections, s1.embroidery_direction_id) : '';
    const scarf1Font = s1 ? lk(maps.fonts, s1.font_id) : '';
    const scarf1DateType = s1 ? lk(maps.dateTypes, s1.date_type_id) : '';
    const scarf1EmbColor = s1?.embroidery_color || '';
    const scarf2Style = s2 ? lk(maps.scarfStyles, s2.scarf_style_id) : '';
    const scarf2Method = s2 ? lk(maps.scarfMethods, s2.scarf_method_id) : '';
    const scarf2EmbDir = s2 ? lk(maps.embroideryDirections, s2.embroidery_direction_id) : '';
    const scarf2Font = s2 ? lk(maps.fonts, s2.font_id) : '';
    const scarf2DateType = s2 ? lk(maps.dateTypes, s2.date_type_id) : '';
    const scarf2EmbColor = s2?.embroidery_color || '';

    // Image URLs
    const logoUrl = storageUrl(order.logo_embroidery_image_url);
    const backUrls = (order.back_embroidery_image_urls || []).map((u: string) => storageUrl(u)).join(' , ');

    const orderCommon = [
      orderNumber, status, createdAt, updatedAt, trackingNumber,
      abayaDesign, sleeveStyle, sleeveColor,
      scarf1Style, scarf1Method, scarf1EmbDir, scarf1Font, scarf1DateType, scarf1EmbColor,
      scarf2Style, scarf2Method, scarf2EmbDir, scarf2Font, scarf2DateType, scarf2EmbColor,
      logoUrl, backUrls,
    ];

    if (students.length === 0) {
      rows.push([...orderCommon, '', '', '', '', '', '', '']);
    } else {
      for (const st of students) {
        const studentScarf = st.scarf_design_id ? (scarfDesignMap.get(st.scarf_design_id) || '') : '';
        const studentHat = st.hat_embroidery_id ? (maps.hatEmbroideries.get(st.hat_embroidery_id)?.name || '') : '';
        const hasLogo = st.has_logo_embroidery ? 'نعم' : '';
        const hasPurple = st.has_purple_package ? 'نعم' : '';
        const backText = st.back_embroidery_text || '';

        rows.push([
          ...orderCommon,
          st.name || '',
          st.size || '',
          studentScarf,
          studentHat,
          hasLogo,
          hasPurple,
          backText,
        ]);
      }
    }
  }

  const csvLines = [HEADERS.map(escCsv).join(',')];
  for (const row of rows) {
    csvLines.push(row.map(escCsv).join(','));
  }

  return '\uFEFF' + csvLines.join('\n');
}

export function downloadCsv(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
