import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const A4_W = 794;
const A4_H = 1123;
const PAD = 40;
const BRAND = '#440376';
const BRAND_LIGHT = '#6B21A8';
const FONT = `'Tajawal', sans-serif`;

interface InvoiceLine {
  label: string;
  detail: string;
  amount: number;
}

interface InvoiceData {
  orderNumber: string;
  lines: InvoiceLine[];
  total: number;
}

function makePage(): HTMLDivElement {
  const d = document.createElement('div');
  d.style.cssText = `width:${A4_W}px;height:${A4_H}px;position:fixed;left:-9999px;top:0;background:linear-gradient(160deg,#fefcff 0%,#f9f6ff 30%,#f4f0fa 60%,#faf7ff 100%);padding:${PAD}px;font-family:${FONT};direction:rtl;box-sizing:border-box;`;
  document.body.appendChild(d);
  return d;
}

export async function generateInvoicePdf(data: InvoiceData) {
  // Load Tajawal font
  const link = document.createElement('link');
  link.href = 'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap';
  link.rel = 'stylesheet';
  document.head.appendChild(link);
  await new Promise(r => setTimeout(r, 500));

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const preTax = data.total / 1.15;
  const taxAmount = data.total - preTax;

  const page = makePage();

  // Convert logo to base64
  let logoSrc = '/logo.svg';
  try {
    const resp = await fetch(logoSrc);
    const blob = await resp.blob();
    logoSrc = await new Promise(resolve => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.readAsDataURL(blob);
    });
  } catch {}

  const linesHtml = data.lines.map(line => `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #ede9f5;font-size:12px;font-weight:600;color:#2d1b4e;text-align:right;font-family:${FONT};">${line.label}</td>
      <td style="padding:12px 16px;border-bottom:1px solid #ede9f5;font-size:11px;color:#8b7fa8;text-align:center;font-family:${FONT};">${line.detail}</td>
      <td style="padding:12px 16px;border-bottom:1px solid #ede9f5;font-size:12px;font-weight:700;color:#2d1b4e;text-align:left;font-family:${FONT};">${fmt(line.amount)} ريال</td>
    </tr>
  `).join('');

  page.innerHTML = `
    <!-- Header -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">
      <div style="text-align:right;font-family:${FONT};line-height:2;">
        <div style="font-size:13px;font-weight:700;color:${BRAND};">مؤسسة آريبا لاين</div>
        <div style="font-size:10px;color:#8b7fa8;">رقم السجل التجاري: 7016401809</div>
        <div style="font-size:10px;color:#8b7fa8;">الرقم الضريبي: 310471508500003</div>
      </div>
      <img src="${logoSrc}" style="height:64px;" />
    </div>

    <!-- Title -->
    <div style="text-align:center;margin:24px 0 20px;padding:16px 0;border-top:3px solid ${BRAND};border-bottom:3px solid ${BRAND};">
      <h1 style="font-size:22px;font-weight:800;color:${BRAND};margin:0;font-family:${FONT};line-height:2;">فاتورة إلكترونية مبسطة</h1>
    </div>

    <!-- Order Info -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;padding:14px 20px;background:#fff;border-radius:12px;border:1px solid #ede9f5;">
      <div style="font-family:${FONT};line-height:2;">
        <span style="font-size:12px;color:#8b7fa8;">رقم الطلب</span>
        <div style="font-size:16px;font-weight:800;color:${BRAND};">${data.orderNumber}</div>
      </div>
      <div style="font-family:${FONT};text-align:left;line-height:2;">
        <span style="font-size:12px;color:#8b7fa8;">التاريخ</span>
        <div style="font-size:13px;font-weight:600;color:#2d1b4e;">${new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </div>
    </div>

    <!-- Items Table -->
    <div style="background:#fff;border-radius:12px;border:1px solid #ede9f5;overflow:hidden;box-shadow:0 2px 12px rgba(68,3,118,0.04);margin-bottom:24px;">
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:linear-gradient(135deg,${BRAND},${BRAND_LIGHT});">
            <th style="padding:14px 16px;font-size:12px;font-weight:700;color:#fff;text-align:right;font-family:${FONT};">البند</th>
            <th style="padding:14px 16px;font-size:12px;font-weight:700;color:#fff;text-align:center;font-family:${FONT};">التفاصيل</th>
            <th style="padding:14px 16px;font-size:12px;font-weight:700;color:#fff;text-align:left;font-family:${FONT};">المبلغ</th>
          </tr>
        </thead>
        <tbody>
          ${linesHtml}
        </tbody>
      </table>
    </div>

    <!-- Totals -->
    <div style="background:#fff;border-radius:12px;border:1px solid #ede9f5;padding:20px;box-shadow:0 2px 12px rgba(68,3,118,0.04);">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f0ecf5;font-family:${FONT};line-height:2;">
        <span style="font-size:13px;color:#8b7fa8;">الإجمالي قبل الضريبة</span>
        <span style="font-size:14px;font-weight:700;color:#2d1b4e;">${fmt(preTax)} ريال</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f0ecf5;font-family:${FONT};line-height:2;">
        <span style="font-size:13px;color:#8b7fa8;">ضريبة القيمة المضافة (15%)</span>
        <span style="font-size:14px;font-weight:700;color:#2d1b4e;">${fmt(taxAmount)} ريال</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0 4px;font-family:${FONT};line-height:2;">
        <span style="font-size:16px;font-weight:800;color:${BRAND};">الإجمالي شامل الضريبة</span>
        <span style="font-size:20px;font-weight:800;color:${BRAND};">${fmt(data.total)} ريال</span>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;margin-top:32px;font-family:${FONT};line-height:2;">
      <div style="font-size:11px;color:#8b7fa8;">شكراً لتعاملكم مع مؤسسة آريبا لاين</div>
      <div style="font-size:10px;color:#c4bbd4;margin-top:4px;">هذه فاتورة إلكترونية مبسطة صادرة آلياً</div>
    </div>
  `;

  const canvas = await html2canvas(page, { scale: 2, useCORS: true, backgroundColor: null });
  document.body.removeChild(page);

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [A4_W, A4_H] });
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, A4_W, A4_H);
  pdf.save(`فاتورة-${data.orderNumber}.pdf`);
}
