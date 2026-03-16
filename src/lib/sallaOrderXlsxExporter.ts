import ExcelJS from 'exceljs';

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

export async function exportSallaOrdersXlsx(orders: SallaOrder[]): Promise<void> {
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
    { header: 'أطراف الوشاح', key: 'scarfMethod', width: 14 },
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
      const row: Record<string, any> = {
        sallaNum: order.salla_order_number,
        internalNum: order.internal_number,
        subNum: getSubNum(order, idx),
        product: item.product_name || '',
      };
      // Map option_values to columns
      for (const [label, value] of Object.entries(item.option_values)) {
        const colKey = kitColumnMap[label];
        if (colKey) {
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
    { header: 'أطراف الوشاح', key: 'scarfMethod', width: 14 },
  ];
  styleHeaderRow(sheet3);

  const scarfColumnMap: Record<string, string> = {
    'الاسم على الوشاح': 'scarfName',
    'الاسم': 'scarfName',
    'لون التطريز': 'embroideryColor',
    'لون تطريز الوشاح': 'embroideryColor',
    'اتجاه التطريز': 'embroideryDir',
    'أطراف الوشاح': 'scarfMethod',
  };

  let hasScarfData = false;
  for (const order of orders) {
    order.items.forEach((item, idx) => {
      if (item.category !== 'scarf') return;
      hasScarfData = true;
      const row: Record<string, any> = {
        sallaNum: order.salla_order_number,
        internalNum: order.internal_number,
        subNum: getSubNum(order, idx),
        product: item.product_name || '',
      };
      for (const [label, value] of Object.entries(item.option_values)) {
        const colKey = scarfColumnMap[label];
        if (colKey) row[colKey] = value;
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
