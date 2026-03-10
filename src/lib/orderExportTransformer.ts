import { supabase } from '@/integrations/supabase/client';

interface LookupMaps {
  abayaDesigns: Map<string, string>;
  sleeveStyles: Map<string, string>;
  scarfStyles: Map<string, string>;
  scarfMethods: Map<string, string>;
  embroideryDirections: Map<string, string>;
  fonts: Map<string, string>;
  dateTypes: Map<string, string>;
  hatStyles: Map<string, string>;
  hatEmbroideries: Map<string, { name: string; has_extra_text: boolean }>;
  cities: Map<string, string>;
  kits: Map<string, string>;
}

async function loadLookupMaps(): Promise<LookupMaps> {
  const [
    abayaRes, sleeveRes, scarfStyleRes, scarfMethodRes,
    embDirRes, fontRes, dateRes, hatStyleRes, hatEmbRes, cityRes, kitRes,
  ] = await Promise.all([
    supabase.from('abaya_designs').select('id, name'),
    supabase.from('sleeve_styles').select('id, name'),
    supabase.from('scarf_styles').select('id, name'),
    supabase.from('scarf_methods').select('id, name'),
    supabase.from('embroidery_directions').select('id, name'),
    supabase.from('fonts').select('id, name'),
    supabase.from('date_types').select('id, name'),
    supabase.from('hat_styles').select('id, name'),
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
    hatStyles: toMap(hatStyleRes.data),
    hatEmbroideries: new Map((hatEmbRes.data || []).map(d => [d.id, { name: d.name, has_extra_text: d.has_extra_text }])),
    cities: toMap(cityRes.data),
    kits: toMap(kitRes.data),
  };
}

function lookup(map: Map<string, string>, id: string | null | undefined): string | null {
  if (!id) return null;
  return map.get(id) || null;
}

export interface TransformedOrder {
  order_details: Record<string, any>;
  scarves_data: Record<string, any>[];
  hats_data: Record<string, any>[];
  students_list: Record<string, any>[];
}

export async function transformOrderForExport(orderId: string): Promise<TransformedOrder | null> {
  const [maps, orderRes, studentsRes, scarfDesignsRes] = await Promise.all([
    loadLookupMaps(),
    supabase.from('orders').select('*').eq('id', orderId).single(),
    supabase.from('students').select('*').eq('order_id', orderId).order('serial_number'),
    supabase.from('order_scarf_designs').select('*').eq('order_id', orderId).order('sort_order'),
  ]);

  const order = orderRes.data;
  if (!order) return null;
  const students = studentsRes.data || [];
  const scarfDesigns = scarfDesignsRes.data || [];

  // Build scarf design map for student references
  const scarfDesignMap = new Map<string, string>();
  scarfDesigns.forEach((sd, i) => {
    const parts: string[] = [];
    const style = lookup(maps.scarfStyles, sd.scarf_style_id);
    if (style) parts.push(style);
    const method = lookup(maps.scarfMethods, sd.scarf_method_id);
    if (method) parts.push(method);
    const label = parts.length > 0 ? parts.join(' - ') : `وشاح ${i + 1}`;
    scarfDesignMap.set(sd.id, label);
  });

  // Order details (flat)
  const order_details: Record<string, any> = {
    'رقم الطلب': order.order_number,
    'نوع الطلب': order.order_type === 'ready_kit' ? 'طقم جاهز' : 'طلب مخصص',
    'الطقم': lookup(maps.kits, order.kit_id),
    'الحالة': order.status,
    'اسم المدرسة': order.school_name,
    'اسم القائدة': order.leader_name,
    'رقم القائدة': order.leader_phone,
    'المدينة': lookup(maps.cities, order.city_id),
    'عدد الطالبات': order.student_count,
    'تصميم العباية': lookup(maps.abayaDesigns, order.abaya_design_id),
    'نوع الكم': lookup(maps.sleeveStyles, order.sleeve_style_id),
    'لون الكم': order.sleeve_color,
    'لون العباية': order.custom_abaya_color,
    'درجة لون العباية': order.custom_abaya_color_degree,
    'لون الوشاح': order.custom_scarf_color,
    'درجة لون الوشاح': order.custom_scarf_color_degree,
    'لون القبعة': order.custom_hat_color,
    'درجة لون القبعة': order.custom_hat_color_degree,
    'تطريز الشعار': order.logo_embroidery_enabled ? `نعم (${order.logo_embroidery_count})` : 'لا',
    'تطريز الظهر': order.back_embroidery_enabled ? `نعم (${order.back_embroidery_count})` : 'لا',
    'تطريز القبعة': order.hat_embroidery_enabled ? `نعم (${order.hat_embroidery_count})` : 'لا',
    'الباقة البنفسجية': order.purple_package_enabled ? `نعم (${order.purple_package_count})` : 'لا',
    'مدينة الشحن': lookup(maps.cities, order.shipping_city_id),
    'اسم المستلم': order.recipient_name,
    'رقم المستلم': order.recipient_phone,
    'الحي': order.district,
    'تفاصيل العنوان': order.address_details,
    'العنوان الوطني': order.national_address,
    'رقم التتبع': order.tracking_number,
    'ملاحظات': order.notes,
    'تاريخ الإنشاء': order.created_at,
  };

  // Remove null values
  for (const key of Object.keys(order_details)) {
    if (order_details[key] === null || order_details[key] === undefined) {
      delete order_details[key];
    }
  }

  // Scarves data (flat)
  const scarves_data = scarfDesigns.map((sd, i) => ({
    'رقم الوشاح': i + 1,
    'شكل الوشاح': lookup(maps.scarfStyles, sd.scarf_style_id),
    'طرف الوشاح': lookup(maps.scarfMethods, sd.scarf_method_id),
    'اتجاه التطريز': lookup(maps.embroideryDirections, sd.embroidery_direction_id),
    'الخط': lookup(maps.fonts, sd.font_id),
    'نوع التاريخ': lookup(maps.dateTypes, sd.date_type_id),
    'لون التطريز': sd.embroidery_color,
  }));

  // Hats data - extract unique hat info from students
  const hatMap = new Map<string, Record<string, any>>();
  students.forEach(s => {
    if (s.hat_embroidery_id && !hatMap.has(s.hat_embroidery_id)) {
      const embInfo = maps.hatEmbroideries.get(s.hat_embroidery_id);
      hatMap.set(s.hat_embroidery_id, {
        'تطريز القبعة': embInfo?.name || s.hat_embroidery_id,
        'يحتاج نص إضافي': embInfo?.has_extra_text ? 'نعم' : 'لا',
      });
    }
  });
  const hats_data = Array.from(hatMap.values());

  // Students list (flat)
  const students_list = students.map(s => {
    const row: Record<string, any> = {
      'الرقم': s.serial_number,
      'الاسم': s.name,
      'المقاس': s.size,
      'الوشاح': s.scarf_design_id ? (scarfDesignMap.get(s.scarf_design_id) || null) : null,
      'اختيار الوشاح': s.scarf_choice,
      'القبعة': s.hat_embroidery_id ? (maps.hatEmbroideries.get(s.hat_embroidery_id)?.name || null) : null,
      'اختيار القبعة': s.hat_choice,
    };
    if (s.hat_extra_text) row['نص القبعة الإضافي'] = s.hat_extra_text;
    if (s.back_embroidery_text) row['نص تطريز الظهر'] = s.back_embroidery_text;
    if (s.has_logo_embroidery) row['تطريز الشعار'] = 'نعم';
    if (s.has_purple_package) row['الباقة البنفسجية'] = 'نعم';
    if (s.extra_services && s.extra_services.length > 0) row['خدمات إضافية'] = s.extra_services.join(', ');
    return row;
  });

  return { order_details, scarves_data, hats_data, students_list };
}

export async function transformMultipleOrdersForExport(orderIds: string[]): Promise<TransformedOrder[]> {
  const results: TransformedOrder[] = [];
  // Load maps once
  const maps = await loadLookupMaps();

  const [ordersRes, studentsRes, scarfDesignsRes] = await Promise.all([
    supabase.from('orders').select('*').in('id', orderIds),
    supabase.from('students').select('*').in('order_id', orderIds).order('serial_number'),
    supabase.from('order_scarf_designs').select('*').in('order_id', orderIds).order('sort_order'),
  ]);

  const allOrders = ordersRes.data || [];
  const allStudents = studentsRes.data || [];
  const allScarfDesigns = scarfDesignsRes.data || [];

  for (const order of allOrders) {
    const students = allStudents.filter(s => s.order_id === order.id);
    const scarfDesigns = allScarfDesigns.filter(sd => sd.order_id === order.id);

    const scarfDesignMap = new Map<string, string>();
    scarfDesigns.forEach((sd, i) => {
      const parts: string[] = [];
      const style = lookup(maps.scarfStyles, sd.scarf_style_id);
      if (style) parts.push(style);
      const method = lookup(maps.scarfMethods, sd.scarf_method_id);
      if (method) parts.push(method);
      scarfDesignMap.set(sd.id, parts.length > 0 ? parts.join(' - ') : `وشاح ${i + 1}`);
    });

    const order_details: Record<string, any> = {
      'رقم الطلب': order.order_number,
      'نوع الطلب': order.order_type === 'ready_kit' ? 'طقم جاهز' : 'طلب مخصص',
      'الطقم': lookup(maps.kits, order.kit_id),
      'الحالة': order.status,
      'اسم المدرسة': order.school_name,
      'اسم القائدة': order.leader_name,
      'رقم القائدة': order.leader_phone,
      'المدينة': lookup(maps.cities, order.city_id),
      'عدد الطالبات': order.student_count,
      'تصميم العباية': lookup(maps.abayaDesigns, order.abaya_design_id),
      'نوع الكم': lookup(maps.sleeveStyles, order.sleeve_style_id),
      'لون الكم': order.sleeve_color,
      'لون العباية': order.custom_abaya_color,
      'درجة لون العباية': order.custom_abaya_color_degree,
      'لون الوشاح': order.custom_scarf_color,
      'درجة لون الوشاح': order.custom_scarf_color_degree,
      'لون القبعة': order.custom_hat_color,
      'درجة لون القبعة': order.custom_hat_color_degree,
      'تطريز الشعار': order.logo_embroidery_enabled ? `نعم (${order.logo_embroidery_count})` : 'لا',
      'تطريز الظهر': order.back_embroidery_enabled ? `نعم (${order.back_embroidery_count})` : 'لا',
      'تطريز القبعة': order.hat_embroidery_enabled ? `نعم (${order.hat_embroidery_count})` : 'لا',
      'الباقة البنفسجية': order.purple_package_enabled ? `نعم (${order.purple_package_count})` : 'لا',
      'مدينة الشحن': lookup(maps.cities, order.shipping_city_id),
      'اسم المستلم': order.recipient_name,
      'رقم المستلم': order.recipient_phone,
      'الحي': order.district,
      'تفاصيل العنوان': order.address_details,
      'العنوان الوطني': order.national_address,
      'رقم التتبع': order.tracking_number,
      'ملاحظات': order.notes,
      'تاريخ الإنشاء': order.created_at,
    };

    for (const key of Object.keys(order_details)) {
      if (order_details[key] === null || order_details[key] === undefined) delete order_details[key];
    }

    const scarves_data = scarfDesigns.map((sd, i) => ({
      'رقم الوشاح': i + 1,
      'شكل الوشاح': lookup(maps.scarfStyles, sd.scarf_style_id),
      'طرف الوشاح': lookup(maps.scarfMethods, sd.scarf_method_id),
      'اتجاه التطريز': lookup(maps.embroideryDirections, sd.embroidery_direction_id),
      'الخط': lookup(maps.fonts, sd.font_id),
      'نوع التاريخ': lookup(maps.dateTypes, sd.date_type_id),
      'لون التطريز': sd.embroidery_color,
    }));

    const hatMap = new Map<string, Record<string, any>>();
    students.forEach(s => {
      if (s.hat_embroidery_id && !hatMap.has(s.hat_embroidery_id)) {
        const embInfo = maps.hatEmbroideries.get(s.hat_embroidery_id);
        hatMap.set(s.hat_embroidery_id, {
          'تطريز القبعة': embInfo?.name || s.hat_embroidery_id,
          'يحتاج نص إضافي': embInfo?.has_extra_text ? 'نعم' : 'لا',
        });
      }
    });

    const students_list = students.map(s => {
      const row: Record<string, any> = {
        'الرقم': s.serial_number,
        'الاسم': s.name,
        'المقاس': s.size,
        'الوشاح': s.scarf_design_id ? (scarfDesignMap.get(s.scarf_design_id) || null) : null,
        'اختيار الوشاح': s.scarf_choice,
        'القبعة': s.hat_embroidery_id ? (maps.hatEmbroideries.get(s.hat_embroidery_id)?.name || null) : null,
        'اختيار القبعة': s.hat_choice,
      };
      if (s.hat_extra_text) row['نص القبعة الإضافي'] = s.hat_extra_text;
      if (s.back_embroidery_text) row['نص تطريز الظهر'] = s.back_embroidery_text;
      if (s.has_logo_embroidery) row['تطريز الشعار'] = 'نعم';
      if (s.has_purple_package) row['الباقة البنفسجية'] = 'نعم';
      if (s.extra_services && s.extra_services.length > 0) row['خدمات إضافية'] = s.extra_services.join(', ');
      return row;
    });

    results.push({ order_details, scarves_data, hats_data: Array.from(hatMap.values()), students_list });
  }

  return results;
}
