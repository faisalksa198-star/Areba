import ExcelJS from 'exceljs';
import { supabase } from '@/integrations/supabase/client';

interface SallaOrderItem {
  id: string;
  product_id: string | null;
  category: string;
  quantity: number;
  option_values: Record<string, any>;
  notes: string | null;
  product_name?: string;
}

interface SallaOrder {
  id: string;
  salla_order_number: string;
  internal_number: number;
  status: string;
  notes: string | null;
  created_at: string;
  items: SallaOrderItem[];
}

interface ProductMasterData {
  abaya_color: string | null;
  abaya_color_degree: string | null;
  scarf_color: string | null;
  scarf_color_degree: string | null;
  hat_color: string | null;
  hat_color_degree: string | null;
  sleeve_color: string | null;
  sleeve_style_name: string | null;
  scarf_style_name: string | null;
  date_type_name: string | null;
  embroidery_color: string | null;
  abaya_design_name: string | null;
  scarf_method_name: string | null;
  embroidery_direction_name: string | null;
  font_name: string | null;
}

function styleHeaderRow(sheet: ExcelJS.Worksheet) {
  const row = sheet.getRow(1);
  row.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
  row.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  row.height = 28;
}

function getSubNum(order: SallaOrder, itemIndex: number): string {
  if (order.items.length <= 1) return String(order.internal_number);
  return `${order.internal_number}-${itemIndex + 1}/${order.items.length}`;
}

async function fetchProductMasterData(productIds: string[]): Promise<Map<string, ProductMasterData>> {
  const map = new Map<string, ProductMasterData>();
  if (productIds.length === 0) return map;

  const uniqueIds = [...new Set(productIds)];

  const { data: products } = await supabase
    .from('salla_products')
    .select('id, abaya_color, abaya_color_degree, scarf_color, scarf_color_degree, hat_color, hat_color_degree, sleeve_color, sleeve_style_id, scarf_style_id, date_type_id, embroidery_color, abaya_design_id, scarf_method_id, embroidery_direction_id, font_id')
    .in('id', uniqueIds);

  if (!products || products.length === 0) return map;

  // Collect all reference IDs
  const sleeveIds = products.map(p => p.sleeve_style_id).filter(Boolean) as string[];
  const scarfStyleIds = products.map(p => p.scarf_style_id).filter(Boolean) as string[];
  const dateTypeIds = products.map(p => p.date_type_id).filter(Boolean) as string[];
  const abayaDesignIds = products.map(p => p.abaya_design_id).filter(Boolean) as string[];
  const scarfMethodIds = products.map(p => p.scarf_method_id).filter(Boolean) as string[];
  const embDirIds = products.map(p => p.embroidery_direction_id).filter(Boolean) as string[];
  const fontIds = products.map(p => p.font_id).filter(Boolean) as string[];

  // Fetch all reference tables in parallel
  const [sleeves, scarfStyles, dateTypes, abayaDesigns, scarfMethods, embDirs, fonts] = await Promise.all([
    sleeveIds.length ? supabase.from('sleeve_styles').select('id, name').in('id', sleeveIds).then(r => r.data || []) : Promise.resolve([]),
    scarfStyleIds.length ? supabase.from('scarf_styles').select('id, name').in('id', scarfStyleIds).then(r => r.data || []) : Promise.resolve([]),
    dateTypeIds.length ? supabase.from('date_types').select('id, name').in('id', dateTypeIds).then(r => r.data || []) : Promise.resolve([]),
    abayaDesignIds.length ? supabase.from('abaya_designs').select('id, name').in('id', abayaDesignIds).then(r => r.data || []) : Promise.resolve([]),
    scarfMethodIds.length ? supabase.from('scarf_methods').select('id, name').in('id', scarfMethodIds).then(r => r.data || []) : Promise.resolve([]),
    embDirIds.length ? supabase.from('embroidery_directions').select('id, name').in('id', embDirIds).then(r => r.data || []) : Promise.resolve([]),
    fontIds.length ? supabase.from('fonts').select('id, name').in('id', fontIds).then(r => r.data || []) : Promise.resolve([]),
  ]);

  const toMap = (arr: { id: string; name: string }[]) => new Map(arr.map(x => [x.id, x.name]));
  const sleeveMap = toMap(sleeves);
  const scarfStyleMap = toMap(scarfStyles);
  const dateTypeMap = toMap(dateTypes);
  const abayaDesignMap = toMap(abayaDesigns);
  const scarfMethodMap = toMap(scarfMethods);
  const embDirMap = toMap(embDirs);
  const fontMap = toMap(fonts);

  for (const p of products) {
    map.set(p.id, {
      abaya_color: p.abaya_color,
      abaya_color_degree: p.abaya_color_degree,
      scarf_color: p.scarf_color,
      scarf_color_degree: p.scarf_color_degree,
      hat_color: p.hat_color,
      hat_color_degree: p.hat_color_degree,
      sleeve_color: p.sleeve_color,
      sleeve_style_name: p.sleeve_style_id ? sleeveMap.get(p.sleeve_style_id) || null : null,
      scarf_style_name: p.scarf_style_id ? scarfStyleMap.get(p.scarf_style_id) || null : null,
      date_type_name: p.date_type_id ? dateTypeMap.get(p.date_type_id) || null : null,
      embroidery_color: p.embroidery_color,
      abaya_design_name: p.abaya_design_id ? abayaDesignMap.get(p.abaya_design_id) || null : null,
      scarf_method_name: p.scarf_method_id ? scarfMethodMap.get(p.scarf_method_id) || null : null,
      embroidery_direction_name: p.embroidery_direction_id ? embDirMap.get(p.embroidery_direction_id) || null : null,
      font_name: p.font_id ? fontMap.get(p.font_id) || null : null,
    });
  }

  return map;
}

export async function exportSallaOrdersXlsx(orders: SallaOrder[]): Promise<void> {
  // Collect all product IDs for master data lookup
  const allProductIds = orders.flatMap(o => o.items.map(i => i.product_id)).filter(Boolean) as string[];
  const productMaster = await fetchProductMasterData(allProductIds);

  const wb = new ExcelJS.Workbook();
  wb.views = [{ rightToLeft: true } as any];

  // ===== Sheet 1: معلومات الطلبات =====
  const sheet1 = wb.addWorksheet('معلومات الطلبات', { views: [{ rightToLeft: true }] });
  sheet1.columns = [
    { header: 'رقم طلب سلة', key: 'sallaNum', width: 16 },
    { header: 'الرقم الداخلي', key: 'internalNum', width: 14 },
    { header: 'إجمالي الأفرع', key: 'totalItems', width: 14 },
    { header: 'عدد الأطقم', key: 'kitCount', width: 12 },
    { header: 'عدد الأوشحة', key: 'scarfCount', width: 12 },
    { header: 'عدد القبعات', key: 'hatCount', width: 12 },
    { header: 'ملاحظات', key: 'notes', width: 24 },
  ];
  styleHeaderRow(sheet1);

  for (const order of orders) {
    const kitCount = order.items.filter(i => i.category === 'kit').length;
    const scarfCount = order.items.filter(i => i.category === 'scarf').length;
    const hatCount = order.items.filter(i => i.category === 'hat').length;
    sheet1.addRow({
      sallaNum: order.salla_order_number,
      internalNum: order.internal_number,
      totalItems: order.items.length,
      kitCount,
      scarfCount,
      hatCount,
      notes: order.notes || '',
    });
  }

  if (orders.length === 0) {
    sheet1.addRow({ sallaNum: 'لا توجد بيانات' });
  }

  // ===== Sheet 2: الأطقم =====
  const sheet2 = wb.addWorksheet('الأطقم', { views: [{ rightToLeft: true }] });
  sheet2.columns = [
    { header: 'رقم طلب سلة', key: 'sallaNum', width: 16 },
    { header: 'الرقم الداخلي', key: 'internalNum', width: 14 },
    { header: 'الرقم الفرعي', key: 'subNum', width: 16 },
    { header: 'المنتج', key: 'product', width: 20 },
    { header: 'لون العباية', key: 'abayaColor', width: 14 },
    { header: 'درجتها', key: 'abayaDegree', width: 12 },
    { header: 'لون الوشاح', key: 'scarfColor', width: 14 },
    { header: 'درجته', key: 'scarfDegree', width: 12 },
    { header: 'لون القبعة', key: 'hatColor', width: 14 },
    { header: 'درجتها', key: 'hatDegree', width: 12 },
    { header: 'طرف الكم', key: 'sleeveStyle', width: 14 },
    { header: 'لون الكم', key: 'sleeveColor', width: 12 },
    { header: 'شكل الوشاح', key: 'scarfStyle', width: 14 },
    { header: 'نوع التاريخ', key: 'dateType', width: 14 },
    { header: 'المقاس', key: 'size', width: 10 },
    { header: 'تصميم العباية', key: 'abayaDesign', width: 16 },
    { header: 'الاسم على الوشاح', key: 'scarfName', width: 18 },
    { header: 'لون تطريز الوشاح', key: 'embroideryColor', width: 16 },
    { header: 'اطراف الوشاح', key: 'scarfMethod', width: 14 },
    { header: 'اتجاه التطريز', key: 'embroideryDir', width: 14 },
    { header: 'الباكجينق', key: 'packaging', width: 12 },
  ];
  styleHeaderRow(sheet2);

  // Column mapping for kits - maps Arabic option labels to column keys
  const kitColumnMap: Record<string, string> = {
    'لون العباية': 'abayaColor',
    'درجة لون العباية': 'abayaDegree',
    'درجتها': 'abayaDegree',
    'لون الوشاح': 'scarfColor',
    'درجة لون الوشاح': 'scarfDegree',
    'درجته': 'scarfDegree',
    'لون القبعة': 'hatColor',
    'درجة لون القبعة': 'hatDegree',
    'طرف الكم': 'sleeveStyle',
    'لون الكم': 'sleeveColor',
    'شكل الوشاح': 'scarfStyle',
    'نوع التاريخ': 'dateType',
    'المقاس': 'size',
    'تصميم العباية': 'abayaDesign',
    'الاسم على الوشاح': 'scarfName',
    'الاسم': 'scarfName',
    'لون تطريز الوشاح': 'embroideryColor',
    'لون التطريز': 'embroideryColor',
    'اطراف الوشاح': 'scarfMethod',
    'أطراف الوشاح': 'scarfMethod',
    'اتجاه التطريز': 'embroideryDir',
    'الباكجينق': 'packaging',
    'الباكيجنق': 'packaging',
    'خط التطريز': 'font',
  };

  let hasKitData = false;
  for (const order of orders) {
    order.items.forEach((item, idx) => {
      if (item.category !== 'kit') return;
      hasKitData = true;

      const master = item.product_id ? productMaster.get(item.product_id) : null;

      // Start with product master data as defaults
      const row: Record<string, any> = {
        sallaNum: order.salla_order_number,
        internalNum: order.internal_number,
        subNum: getSubNum(order, idx),
        product: item.product_name || '',
        abayaColor: master?.abaya_color || '',
        abayaDegree: master?.abaya_color_degree || '',
        scarfColor: master?.scarf_color || '',
        scarfDegree: master?.scarf_color_degree || '',
        hatColor: master?.hat_color || '',
        hatDegree: master?.hat_color_degree || '',
        sleeveStyle: master?.sleeve_style_name || '',
        sleeveColor: master?.sleeve_color || '',
        scarfStyle: master?.scarf_style_name || '',
        dateType: master?.date_type_name || '',
        abayaDesign: master?.abaya_design_name || '',
        embroideryColor: master?.embroidery_color || '',
        scarfMethod: master?.scarf_method_name || '',
        embroideryDir: master?.embroidery_direction_name || '',
      };

      // Override with option_values from the order item (dynamic/user choices)
      for (const [label, value] of Object.entries(item.option_values)) {
        const colKey = kitColumnMap[label];
        if (colKey && value) {
          row[colKey] = value;
        }
      }
      sheet2.addRow(row);
    });
  }
  if (!hasKitData) sheet2.addRow({ sallaNum: 'لا توجد بيانات' });

  // ===== Sheet 3: الأوشحة =====
  const sheet3 = wb.addWorksheet('الأوشحة', { views: [{ rightToLeft: true }] });
  sheet3.columns = [
    { header: 'رقم طلب سلة', key: 'sallaNum', width: 16 },
    { header: 'الرقم الداخلي', key: 'internalNum', width: 14 },
    { header: 'الرقم الفرعي', key: 'subNum', width: 16 },
    { header: 'المنتج', key: 'product', width: 20 },
    { header: 'الاسم على الوشاح', key: 'scarfName', width: 18 },
    { header: 'لون التطريز', key: 'embroideryColor', width: 16 },
    { header: 'اتجاه التطريز', key: 'embroideryDir', width: 14 },
    { header: 'اطراف الوشاح', key: 'scarfMethod', width: 14 },
  ];
  styleHeaderRow(sheet3);

  const scarfColumnMap: Record<string, string> = {
    'الاسم على الوشاح': 'scarfName',
    'الاسم': 'scarfName',
    'لون التطريز': 'embroideryColor',
    'لون تطريز الوشاح': 'embroideryColor',
    'اتجاه التطريز': 'embroideryDir',
    'اطراف الوشاح': 'scarfMethod',
    'أطراف الوشاح': 'scarfMethod',
  };

  let hasScarfData = false;
  for (const order of orders) {
    order.items.forEach((item, idx) => {
      if (item.category !== 'scarf') return;
      hasScarfData = true;

      const master = item.product_id ? productMaster.get(item.product_id) : null;

      const row: Record<string, any> = {
        sallaNum: order.salla_order_number,
        internalNum: order.internal_number,
        subNum: getSubNum(order, idx),
        product: item.product_name || '',
        embroideryColor: master?.embroidery_color || '',
        embroideryDir: master?.embroidery_direction_name || '',
        scarfMethod: master?.scarf_method_name || '',
      };
      for (const [label, value] of Object.entries(item.option_values)) {
        const colKey = scarfColumnMap[label];
        if (colKey && value) row[colKey] = value;
      }
      sheet3.addRow(row);
    });
  }
  if (!hasScarfData) sheet3.addRow({ sallaNum: 'لا توجد بيانات' });

  // ===== Sheet 4: القبعات =====
  const sheet4 = wb.addWorksheet('القبعات', { views: [{ rightToLeft: true }] });
  sheet4.columns = [
    { header: 'رقم طلب سلة', key: 'sallaNum', width: 16 },
    { header: 'الرقم الداخلي', key: 'internalNum', width: 14 },
    { header: 'الرقم الفرعي', key: 'subNum', width: 16 },
    { header: 'المنتج', key: 'product', width: 20 },
    { header: 'لون هدب القبعة', key: 'fringeColor', width: 16 },
  ];
  styleHeaderRow(sheet4);

  const hatColumnMap: Record<string, string> = {
    'لون هدب القبعة': 'fringeColor',
    'لون الهدب': 'fringeColor',
  };

  let hasHatData = false;
  for (const order of orders) {
    order.items.forEach((item, idx) => {
      if (item.category !== 'hat') return;
      hasHatData = true;
      const row: Record<string, any> = {
        sallaNum: order.salla_order_number,
        internalNum: order.internal_number,
        subNum: getSubNum(order, idx),
        product: item.product_name || '',
      };
      for (const [label, value] of Object.entries(item.option_values)) {
        const colKey = hatColumnMap[label];
        if (colKey) row[colKey] = value;
      }
      sheet4.addRow(row);
    });
  }
  if (!hasHatData) sheet4.addRow({ sallaNum: 'لا توجد بيانات' });

  // Download
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `salla-orders-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
