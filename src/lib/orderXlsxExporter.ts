import ExcelJS from 'exceljs';
import { supabase } from '@/integrations/supabase/client';

// ── Lookup helpers ──────────────────────────────────────────────
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
  kits: Map<string, { name: string; abaya_color?: string; abaya_color_degree?: string; scarf_color?: string; scarf_color_degree?: string; hat_color?: string; hat_color_degree?: string }>;
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
    supabase.from('ready_kits').select('id, name, abaya_color, abaya_color_degree, scarf_color, scarf_color_degree, hat_color, hat_color_degree'),
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
    kits: new Map((kitRes.data || []).map(d => [d.id, {
      name: d.name,
      abaya_color: d.abaya_color,
      abaya_color_degree: d.abaya_color_degree,
      scarf_color: d.scarf_color,
      scarf_color_degree: d.scarf_color_degree,
      hat_color: d.hat_color,
      hat_color_degree: d.hat_color_degree,
    }])),
  };
}

function lk(map: Map<string, string>, id: string | null | undefined): string {
  if (!id) return '';
  return map.get(id) || '';
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

function storageUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/images/${path}`;
}

function shortOrderNumber(on: string): string {
  const idx = on.indexOf('-');
  return idx >= 0 ? on.substring(idx + 1) : on;
}

// ── Style helpers ──────────────────────────────────────────────
function styleHeaderRow(sheet: ExcelJS.Worksheet) {
  const row = sheet.getRow(1);
  row.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
  row.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  row.height = 28;
}

function setHyperlink(cell: ExcelJS.Cell, url: string) {
  if (!url) return;
  cell.value = { text: url, hyperlink: url };
  cell.font = { color: { argb: 'FF0563C1' }, underline: true };
}

// ── Main export ────────────────────────────────────────────────
export async function exportOrdersXlsx(orderIds: string[]): Promise<void> {
  const [maps, ordersRes, studentsRes, scarfDesignsRes] = await Promise.all([
    loadLookupMaps(),
    supabase.from('orders').select('*').in('id', orderIds),
    supabase.from('students').select('*').in('order_id', orderIds).order('serial_number'),
    supabase.from('order_scarf_designs').select('*').in('order_id', orderIds).order('sort_order'),
  ]);

  const allOrders = ordersRes.data || [];
  const allStudents = studentsRes.data || [];
  const allScarfDesigns = scarfDesignsRes.data || [];

  const wb = new ExcelJS.Workbook();
  wb.views = [{ rightToLeft: true } as any];

  // ═══════════════════════════════════════════════════════════
  // Sheet 1: ملخص الطلب
  // ═══════════════════════════════════════════════════════════
  const s1 = wb.addWorksheet('ملخص الطلب', { views: [{ rightToLeft: true }] });
  s1.columns = [
    { header: 'رقم الطلب', key: 'num', width: 12 },
    { header: 'تاريخ الطلب', key: 'date', width: 14 },
    { header: 'العدد', key: 'count', width: 8 },
    { header: 'تصميم العباية', key: 'abaya', width: 18 },
    { header: 'طول العباية', key: 'abayaLen', width: 12 },
    { header: 'تصميم طرف الكم', key: 'sleeve', width: 16 },
    { header: 'لون طرف الكم', key: 'sleeveColor', width: 14 },
    { header: 'نوع المنتج', key: 'type', width: 14 },
    { header: 'اسم المنتج', key: 'kitName', width: 18 },
    { header: 'رابط صورة الألوان', key: 'colorImageUrl', width: 35 },
    { header: 'لون العباية', key: 'abayaColor', width: 14 },
    { header: 'درجتها', key: 'abayaDeg', width: 10 },
    { header: 'لون الوشاح', key: 'scarfColor', width: 14 },
    { header: 'درجته', key: 'scarfDeg', width: 10 },
    { header: 'لون القبعة', key: 'hatColor', width: 14 },
    { header: 'درجتها', key: 'hatDeg', width: 10 },
    { header: 'عدد الشعارات', key: 'logoCount', width: 12 },
    { header: 'رابط صورة الشعار', key: 'logoUrl', width: 35 },
    { header: 'عدد التطريز الخلفي', key: 'backCount', width: 14 },
    { header: 'رابط صورة 1', key: 'back1', width: 35 },
    { header: 'رابط صورة 2', key: 'back2', width: 35 },
    { header: 'رابط صورة 3', key: 'back3', width: 35 },
    { header: 'رابط صورة 4', key: 'back4', width: 35 },
    { header: 'رابط صورة 5', key: 'back5', width: 35 },
  ];
  styleHeaderRow(s1);

  for (const o of allOrders) {
    const isKit = o.order_type === 'ready_kit';
    const kit = isKit && o.kit_id ? maps.kits.get(o.kit_id) : null;

    // Colors: for ready_kit, pull from kit; for custom, pull from order
    const abayaColor = isKit ? (kit?.abaya_color || '') : (o.custom_abaya_color || '');
    const abayaDeg = isKit ? (kit?.abaya_color_degree || '') : (o.custom_abaya_color_degree || '');
    const scarfColor = isKit ? (kit?.scarf_color || '') : (o.custom_scarf_color || '');
    const scarfDeg = isKit ? (kit?.scarf_color_degree || '') : (o.custom_scarf_color_degree || '');
    const hatColor = isKit ? (kit?.hat_color || '') : (o.custom_hat_color || '');
    const hatDeg = isKit ? (kit?.hat_color_degree || '') : (o.custom_hat_color_degree || '');

    const logoUrl = storageUrl(o.logo_embroidery_image_url);
    const backUrls = (o.back_embroidery_image_urls || []).map((u: string) => storageUrl(u));
    const colorImgUrl = storageUrl(o.color_image_url);

    const rowNum = s1.rowCount + 1;
    s1.addRow({
      num: shortOrderNumber(o.order_number),
      date: o.created_at ? new Date(o.created_at).toLocaleDateString('ar-SA') : '',
      count: o.student_count || 0,
      abaya: lk(maps.abayaDesigns, o.abaya_design_id),
      abayaLen: o.abaya_length || 'ثابت',
      sleeve: lk(maps.sleeveStyles, o.sleeve_style_id),
      sleeveColor: o.sleeve_color || '',
      type: isKit ? 'طقم جاهز' : 'تفصيل',
      kitName: isKit ? (kit?.name || '') : '',
      colorImageUrl: '',
      abayaColor,
      abayaDeg,
      scarfColor,
      scarfDeg,
      hatColor,
      hatDeg,
      logoCount: o.logo_embroidery_count || 0,
      logoUrl: '',
      backCount: o.back_embroidery_count || 0,
      back1: '', back2: '', back3: '', back4: '', back5: '',
    });

    const row = s1.getRow(rowNum);
    if (colorImgUrl) setHyperlink(row.getCell('colorImageUrl'), colorImgUrl);
    if (logoUrl) setHyperlink(row.getCell('logoUrl'), logoUrl);
    backUrls.forEach((url: string, j: number) => {
      if (url && j < 5) setHyperlink(row.getCell(`back${j + 1}`), url);
    });
  }

  // ═══════════════════════════════════════════════════════════
  // Sheet 2: تصاميم الأوشحة
  // ═══════════════════════════════════════════════════════════
  const s2 = wb.addWorksheet('تصاميم الأوشحة', { views: [{ rightToLeft: true }] });
  s2.columns = [
    { header: 'رقم الطلب', key: 'num', width: 12 },
    { header: 'رقم الوشاح', key: 'scarfNum', width: 12 },
    { header: 'تصميم الوشاح', key: 'style', width: 16 },
    { header: 'طرف الوشاح', key: 'method', width: 14 },
    { header: 'اتجاه التطريز', key: 'dir', width: 14 },
    { header: 'نوع التاريخ', key: 'dateType', width: 12 },
    { header: 'لون التطريز', key: 'embColor', width: 12 },
    { header: 'خط التطريز', key: 'font', width: 14 },
  ];
  styleHeaderRow(s2);

  for (const o of allOrders) {
    const scarfs = allScarfDesigns.filter(sd => sd.order_id === o.id);
    const on = shortOrderNumber(o.order_number);
    if (scarfs.length === 0) continue;
    scarfs.forEach((sd, i) => {
      s2.addRow({
        num: on,
        scarfNum: `وشاح ${i + 1}`,
        style: lk(maps.scarfStyles, sd.scarf_style_id),
        method: lk(maps.scarfMethods, sd.scarf_method_id),
        dir: lk(maps.embroideryDirections, sd.embroidery_direction_id),
        dateType: lk(maps.dateTypes, sd.date_type_id),
        embColor: sd.embroidery_color || '',
        font: lk(maps.fonts, sd.font_id),
      });
    });
  }

  // ═══════════════════════════════════════════════════════════
  // Sheet 3: تصاميم القبعات (one row per student)
  // ═══════════════════════════════════════════════════════════
  const s3 = wb.addWorksheet('تصاميم القبعات', { views: [{ rightToLeft: true }] });
  s3.columns = [
    { header: 'رقم الطلب', key: 'num', width: 12 },
    { header: 'رقم التصميم', key: 'designId', width: 18 },
    { header: 'رمز التصميم', key: 'designCode', width: 14 },
    { header: 'لون الهدب', key: 'fringeColor', width: 14 },
  ];
  styleHeaderRow(s3);

  const studentHatCodeMap = new Map<string, string>();

  for (const o of allOrders) {
    const students = allStudents.filter(st => st.order_id === o.id);
    const scarfs = allScarfDesigns.filter(sd => sd.order_id === o.id);
    const on = shortOrderNumber(o.order_number);

    const scarfColorMap = new Map<string, string>();
    scarfs.forEach(sd => {
      if (sd.embroidery_color) scarfColorMap.set(sd.id, sd.embroidery_color);
    });
    const defaultFringeColor = scarfs[0]?.embroidery_color || '';

    let hatIndex = 0;
    for (const st of students) {
      hatIndex++;
      const code = `قبعة ${hatIndex}`;
      studentHatCodeMap.set(st.id, code);

      const isNone = !st.hat_embroidery_id;
      const hatInfo = isNone ? null : maps.hatEmbroideries.get(st.hat_embroidery_id!);

      const fringeColor = st.scarf_design_id
        ? (scarfColorMap.get(st.scarf_design_id) || defaultFringeColor)
        : defaultFringeColor;

      s3.addRow({
        num: on,
        designId: isNone ? '0' : (hatInfo?.name || ''),
        designCode: code,
        fringeColor,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Sheet 4: قائمة الأسماء
  // ═══════════════════════════════════════════════════════════
  const s4 = wb.addWorksheet('قائمة الأسماء', { views: [{ rightToLeft: true }] });
  s4.columns = [
    { header: 'رقم الطلب', key: 'num', width: 12 },
    { header: 'رقم الطالبة', key: 'serial', width: 10 },
    { header: 'الاسم', key: 'name', width: 22 },
    { header: 'المقاس', key: 'size', width: 10 },
    { header: 'رمز الوشاح', key: 'scarfCode', width: 12 },
    { header: 'رقم القبعة', key: 'hatCode', width: 12 },
    { header: 'هل يوجد شعار؟', key: 'logo', width: 14 },
    { header: 'نص التطريز الخلفي', key: 'backText', width: 22 },
    { header: 'نص تطريز القبعة', key: 'hatText', width: 22 },
    { header: 'نوع الباقة', key: 'packageType', width: 12 },
  ];
  styleHeaderRow(s4);

  const addedStudentIds = new Set<string>();

  for (const o of allOrders) {
    const students = allStudents.filter(st => st.order_id === o.id);
    const scarfs = allScarfDesigns.filter(sd => sd.order_id === o.id);
    const on = shortOrderNumber(o.order_number);

    const scarfCodeMap = new Map<string, string>();
    scarfs.forEach((sd, i) => {
      scarfCodeMap.set(sd.id, `وشاح ${i + 1}`);
    });

    for (const st of students) {
      if (addedStudentIds.has(st.id)) continue;
      addedStudentIds.add(st.id);

      const scarfCode = st.scarf_design_id ? (scarfCodeMap.get(st.scarf_design_id) || '') : '';
      const hatCode = studentHatCodeMap.get(st.id) || '';

      s4.addRow({
        num: on,
        serial: st.serial_number,
        name: st.name || '',
        size: st.size || '',
        scarfCode,
        hatCode,
        logo: st.has_logo_embroidery ? 'نعم' : 'لا',
        backText: st.back_embroidery_text || '',
        hatText: st.hat_extra_text || '',
        packageType: st.has_purple_package ? 'Purple' : 'Normal',
      });
    }
  }

  // ── Generate and download ────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `orders-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
