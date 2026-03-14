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

const STATUS_LABELS: Record<string, string> = {
  pending_data: 'بانتظار البيانات',
  under_review: 'بانتظار المراجعة',
  in_progress: 'قيد التنفيذ',
  shipped: 'تم الشحن',
  completed: 'منتهي',
  cancelled: 'ملغي',
};

function styleHeaderRow(sheet: ExcelJS.Worksheet) {
  const row = sheet.getRow(1);
  row.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
  row.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  row.height = 28;
}

export async function exportSallaOrdersXlsx(orders: SallaOrder[]): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.views = [{ rightToLeft: true } as any];

  // Collect all unique option keys per category
  const optionKeys: Record<string, Set<string>> = { kit: new Set(), scarf: new Set(), hat: new Set() };
  for (const order of orders) {
    for (const item of order.items) {
      const cat = item.category || 'kit';
      if (!optionKeys[cat]) optionKeys[cat] = new Set();
      Object.keys(item.option_values || {}).forEach(k => optionKeys[cat].add(k));
    }
  }

  const sheetConfigs: { category: string; label: string }[] = [
    { category: 'kit', label: 'الأطقم' },
    { category: 'scarf', label: 'الأوشحة' },
    { category: 'hat', label: 'القبعات' },
  ];

  for (const cfg of sheetConfigs) {
    const catItems: { order: SallaOrder; item: SallaOrderItem; subNum: string }[] = [];
    for (const order of orders) {
      const itemsInCat = order.items.filter(i => i.category === cfg.category);
      const totalItems = order.items.length;
      let globalIdx = 0;
      for (let i = 0; i < order.items.length; i++) {
        if (order.items[i].category === cfg.category) {
          const subNum = totalItems > 1 ? `${order.internal_number}-${i + 1}/${totalItems}` : String(order.internal_number);
          catItems.push({ order, item: order.items[i], subNum });
        }
      }
    }

    const keys = [...optionKeys[cfg.category]];
    const sheet = wb.addWorksheet(cfg.label, { views: [{ rightToLeft: true }] });

    const baseCols = [
      { header: 'رقم طلب سلة', key: 'sallaNum', width: 16 },
      { header: 'الرقم الداخلي', key: 'internalNum', width: 14 },
      { header: 'الرقم الفرعي', key: 'subNum', width: 16 },
      { header: 'المنتج', key: 'product', width: 20 },
      { header: 'الكمية', key: 'qty', width: 10 },
      { header: 'الحالة', key: 'status', width: 16 },
      { header: 'التاريخ', key: 'date', width: 14 },
      { header: 'ملاحظات', key: 'notes', width: 22 },
    ];

    const optCols = keys.map(k => ({ header: k, key: `opt_${k}`, width: 16 }));
    sheet.columns = [...baseCols, ...optCols];
    styleHeaderRow(sheet);

    for (const { order, item, subNum } of catItems) {
      const row: Record<string, any> = {
        sallaNum: order.salla_order_number,
        internalNum: order.internal_number,
        subNum,
        product: item.product_name || '',
        qty: item.quantity,
        status: STATUS_LABELS[order.status] || order.status,
        date: order.created_at ? new Date(order.created_at).toLocaleDateString('ar-SA') : '',
        notes: item.notes || order.notes || '',
      };
      for (const k of keys) {
        row[`opt_${k}`] = item.option_values?.[k] ?? '';
      }
      sheet.addRow(row);
    }

    if (catItems.length === 0) {
      sheet.addRow({ sallaNum: 'لا توجد بيانات' });
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `salla-orders-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
