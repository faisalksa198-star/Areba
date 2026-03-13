import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase } from '@/integrations/supabase/client';

const A4_W = 794;
const A4_H = 1123;
const PAD = 40;
const BRAND_COLOR = '#440376';

async function toBase64(url: string): Promise<string> {
  if (!url) return '';
  try {
    const res = await fetch(url, { mode: 'cors' });
    const blob = await res.blob();
    return new Promise(resolve => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.readAsDataURL(blob);
    });
  } catch { return ''; }
}

function hdr(logo: string): string {
  return `<div style="text-align:center;margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid ${BRAND_COLOR}20;">
    <img src="${logo}" style="height:32px;" />
  </div>`;
}

function ttl(text: string): string {
  return `<h2 style="font-size:20px;font-weight:700;color:${BRAND_COLOR};text-align:center;margin-bottom:20px;">${text}</h2>`;
}

function row(label: string, value: string): string {
  return `<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f0f0f0;">
    <span style="color:#888;font-size:13px;">${label}</span>
    <span style="font-weight:600;font-size:13px;color:#333;">${value}</span>
  </div>`;
}

function makePage(): HTMLDivElement {
  const d = document.createElement('div');
  d.style.cssText = `width:${A4_W}px;min-height:${A4_H}px;background:#fff;padding:${PAD}px;font-family:Tajawal,Arial,sans-serif;direction:rtl;position:absolute;left:-9999px;top:0;box-sizing:border-box;color:#333;`;
  return d;
}

async function capture(page: HTMLDivElement): Promise<HTMLCanvasElement> {
  document.body.appendChild(page);
  await new Promise(r => setTimeout(r, 150));
  const canvas = await html2canvas(page, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
  document.body.removeChild(page);
  return canvas;
}

export async function generateOrderPdf(orderId: string): Promise<void> {
  // Load Arabic font
  const fontLink = document.createElement('link');
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap';
  fontLink.rel = 'stylesheet';
  document.head.appendChild(fontLink);
  await document.fonts.ready;
  await new Promise(r => setTimeout(r, 300));

  // Fetch all data
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

  const order = orderRes.data as any;
  if (!order) return;

  const students = (studentsRes.data || []) as any[];
  const scarfDesigns = (scarfDesignsRes.data || []) as any[];
  const extraScarves = (extraScarvesRes.data || []) as any[];
  const extraHats = (extraHatsRes.data || []) as any[];

  const isKit = order.order_type === 'ready_kit';
  const kit = isKit ? order.ready_kits : null;
  const abayaDesign = isKit ? kit?.abaya_designs : order.abaya_designs;
  const sleeveStyle = isKit ? kit?.sleeve_styles : order.sleeve_styles;
  const sleeveColor = isKit ? (kit?.sleeve_color || '') : (order.sleeve_color || '');
  const abayaColor = isKit ? kit?.abaya_color : order.custom_abaya_color;
  const abayaColorDeg = isKit ? kit?.abaya_color_degree : order.custom_abaya_color_degree;
  const scarfColor = isKit ? kit?.scarf_color : order.custom_scarf_color;
  const scarfColorDeg = isKit ? kit?.scarf_color_degree : order.custom_scarf_color_degree;
  const hatColor = isKit ? kit?.hat_color : order.custom_hat_color;
  const hatColorDeg = isKit ? kit?.hat_color_degree : order.custom_hat_color_degree;

  // Fetch shipping city name
  let shippingCityName = '';
  if (order.shipping_city_id) {
    const { data: cityData } = await supabase.from('cities').select('name').eq('id', order.shipping_city_id).single();
    shippingCityName = cityData?.name || '';
  }

  // Convert images to base64
  const logoBase64 = await toBase64(window.location.origin + '/logo.svg');
  const abayaImg = await toBase64(abayaDesign?.image_url || '');
  const sleeveImg = await toBase64(sleeveStyle?.image_url || '');

  // Scarf images
  const scarfImgs = new Map<string, string>();
  for (const sd of scarfDesigns) {
    if (sd.scarf_styles?.image_url) {
      scarfImgs.set(sd.id, await toBase64(sd.scarf_styles.image_url));
    }
  }

  // Hat embroidery images
  const hatImgs = new Map<string, string>();
  const hatIds = new Set<string>();
  students.forEach((s: any) => s.hat_embroidery_id && hatIds.add(s.hat_embroidery_id));
  extraHats.forEach((h: any) => h.hat_embroidery_id && hatIds.add(h.hat_embroidery_id));
  for (const id of hatIds) {
    const { data } = await supabase.from('hat_embroideries').select('image_url').eq('id', id).single();
    if (data?.image_url) hatImgs.set(id, await toBase64(data.image_url));
  }

  const pages: HTMLDivElement[] = [];
  const sc = order.student_count || 0;
  const esc = order.extra_scarf_count || 0;
  const ehc = order.extra_hat_count || 0;

  // ════════════════════════════════════════
  // PAGE 1: Order Info
  // ════════════════════════════════════════
  const p1 = makePage();
  let h1 = hdr(logoBase64) + ttl('بيانات الطلب');
  h1 += `<div style="max-width:480px;margin:0 auto;background:#fafafa;border-radius:12px;padding:20px;">`;
  const addIf = (l: string, v: any) => { if (v && v !== 0) h1 += row(l, String(v)); };
  addIf('رقم الطلب', order.order_number);
  addIf('تاريخ الطلب', order.created_at ? new Date(order.created_at).toLocaleDateString('ar-SA') : '');
  addIf('مدة التنفيذ (أيام)', (order as any).execution_duration);
  addIf('اسم القائدة', order.leader_name);
  addIf('اسم المدرسة', order.school_name);
  addIf('نوع الطلب', isKit ? 'طقم جاهز' : 'تفصيل');
  if (isKit && kit?.name) addIf('اسم الطقم', kit.name);
  addIf('عدد الأطقم', sc);
  addIf('الأوشحة الإضافية', esc);
  addIf('القبعات الإضافية', ehc);
  addIf('عدد تطريز الشعار', order.logo_embroidery_count);
  addIf('عدد التطريز الخلفي', order.back_embroidery_count);
  addIf('عدد تطريز القبعات', order.hat_embroidery_count);
  addIf('عدد بكج Purple', order.purple_package_count);
  h1 += `</div>`;
  p1.innerHTML = h1;
  pages.push(p1);

  // ════════════════════════════════════════
  // PAGE 2: Abaya (conditional)
  // ════════════════════════════════════════
  if (sc > 0 && (abayaDesign || abayaColor)) {
    const p = makePage();
    let h = hdr(logoBase64) + ttl('تفاصيل العباية');
    h += `<div style="display:flex;flex-direction:column;align-items:center;gap:20px;">`;
    if (abayaImg) {
      h += `<div style="border-radius:16px;overflow:hidden;border:1px solid #eee;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
        <img src="${abayaImg}" style="max-width:280px;max-height:380px;display:block;" />
      </div>`;
    }
    h += `<div style="max-width:400px;width:100%;background:#fafafa;border-radius:12px;padding:16px;">`;
    if (abayaDesign?.name) h += row('تصميم العباية', abayaDesign.name);
    if (abayaColor) h += row('لون العباية', [abayaColor, abayaColorDeg].filter(Boolean).join(' - '));
    if (order.abaya_length) h += row('طول العباية', order.abaya_length);
    if (sleeveStyle?.name) h += row('طرف الكم', sleeveStyle.name);
    if (sleeveColor) h += row('لون طرف الكم', sleeveColor);
    h += `</div>`;
    if (sleeveImg) {
      h += `<div style="border-radius:12px;overflow:hidden;border:1px solid #eee;">
        <img src="${sleeveImg}" style="max-width:200px;display:block;" />
      </div>`;
    }
    h += `</div>`;
    p.innerHTML = h;
    pages.push(p);
  }

  // ════════════════════════════════════════
  // PAGE 3: Scarves (conditional)
  // ════════════════════════════════════════
  if (scarfDesigns.length > 0) {
    const p = makePage();
    let h = hdr(logoBase64) + ttl('تصاميم الأوشحة');
    h += `<div style="display:flex;flex-wrap:wrap;gap:14px;justify-content:center;">`;
    scarfDesigns.forEach((sd: any, i: number) => {
      const img = scarfImgs.get(sd.id);
      h += `<div style="width:210px;border:1px solid #eee;border-radius:12px;overflow:hidden;background:#fafafa;">`;
      if (img) h += `<img src="${img}" style="width:100%;height:140px;object-fit:cover;" />`;
      h += `<div style="padding:10px;">`;
      h += `<p style="font-weight:700;font-size:13px;color:${BRAND_COLOR};margin:0 0 6px;">وشاح ${i + 1}</p>`;
      const detail = (l: string, v: string) => { if (v) h += `<p style="font-size:11px;color:#666;margin:3px 0;">${l}: <strong>${v}</strong></p>`; };
      detail('التصميم', sd.scarf_styles?.name);
      detail('الطرف', sd.scarf_methods?.name);
      detail('اتجاه التطريز', sd.embroidery_directions?.name);
      detail('التاريخ', sd.date_types?.name);
      detail('الخط', sd.fonts?.name);
      detail('لون التطريز', sd.embroidery_color);
      h += `</div></div>`;
    });
    h += `</div>`;

    // Embroidery services
    if (order.logo_embroidery_enabled || order.back_embroidery_enabled) {
      h += `<div style="margin-top:24px;max-width:400px;margin-left:auto;margin-right:auto;background:#fafafa;border-radius:12px;padding:16px;">`;
      h += `<h3 style="font-size:15px;font-weight:700;color:${BRAND_COLOR};margin:0 0 10px;">خدمات التطريز</h3>`;
      if (order.logo_embroidery_enabled) h += row('تطريز الشعار', `${order.logo_embroidery_count || 0}`);
      if (order.back_embroidery_enabled) h += row('التطريز الخلفي', `${order.back_embroidery_count || 0}`);
      h += `</div>`;
    }

    if (scarfColor) {
      h += `<div style="text-align:center;margin-top:16px;font-size:13px;color:#666;">لون الوشاح: <strong>${[scarfColor, scarfColorDeg].filter(Boolean).join(' - ')}</strong></div>`;
    }

    p.innerHTML = h;
    pages.push(p);
  }

  // ════════════════════════════════════════
  // PAGE 4: Hats (conditional)
  // ════════════════════════════════════════
  const hasHats = students.some((s: any) => s.hat_embroidery_id) || extraHats.length > 0;
  if (hasHats) {
    const p = makePage();
    let h = hdr(logoBase64) + ttl('تصاميم القبعات');

    if (hatColor) {
      h += `<div style="text-align:center;margin-bottom:20px;font-size:14px;color:#666;">لون القبعة: <strong style="color:#333;">${[hatColor, hatColorDeg].filter(Boolean).join(' - ')}</strong></div>`;
    }

    // Group hats
    const groups = new Map<string, { name: string; img: string; count: number; fringe: string }>();
    for (const st of students) {
      if (!st.hat_embroidery_id) continue;
      const hn = st.hat_embroideries?.name || '';
      if (hn === 'بدون تطريز') continue;
      const img = hatImgs.get(st.hat_embroidery_id) || '';
      const key = hn;
      const ex = groups.get(key);
      if (ex) ex.count++; else groups.set(key, { name: hn, img, count: 1, fringe: '' });
    }
    for (const eh of extraHats) {
      if (!eh.hat_embroidery_id) continue;
      const hn = eh.hat_embroideries?.name || '';
      if (hn === 'بدون تطريز') continue;
      const img = hatImgs.get(eh.hat_embroidery_id) || '';
      const fc = eh.fringe_color || '';
      const key = `${hn}||${fc}`;
      const ex = groups.get(key);
      if (ex) ex.count++; else groups.set(key, { name: hn, img, count: 1, fringe: fc });
    }

    h += `<div style="display:flex;flex-wrap:wrap;gap:14px;justify-content:center;">`;
    for (const g of groups.values()) {
      h += `<div style="width:170px;border:1px solid #eee;border-radius:12px;overflow:hidden;background:#fafafa;text-align:center;">`;
      if (g.img) h += `<img src="${g.img}" style="width:100%;height:110px;object-fit:cover;" />`;
      h += `<div style="padding:10px;">`;
      h += `<p style="font-weight:700;font-size:13px;margin:0 0 4px;">${g.name}</p>`;
      h += `<p style="font-size:12px;color:#666;margin:2px 0;">الكمية: ${g.count}</p>`;
      if (g.fringe) h += `<p style="font-size:12px;color:#666;margin:2px 0;">الهدب: ${g.fringe}</p>`;
      h += `</div></div>`;
    }
    h += `</div>`;
    p.innerHTML = h;
    pages.push(p);
  }

  // ════════════════════════════════════════
  // PAGE 5+: Names Table (paginated)
  // ════════════════════════════════════════
  const ROWS_PER_PAGE = 18;
  interface NameRow { serial: string; name: string; size: string; scarfNum: string; hatDesign: string; services: string; type: string }
  const allRows: NameRow[] = [];

  const scarfCodeMap = new Map<string, number>();
  scarfDesigns.forEach((sd: any, i: number) => scarfCodeMap.set(sd.id, i + 1));

  for (const s of students) {
    const sn = s.scarf_design_id ? String(scarfCodeMap.get(s.scarf_design_id) || '') : '';
    const hn = s.hat_embroideries?.name || '';
    const hatD = hn === 'بدون تطريز' ? '' : (hn + (s.hat_extra_text ? ` (${s.hat_extra_text})` : ''));
    const svcs: string[] = [];
    if (s.has_logo_embroidery) svcs.push('شعار');
    if (s.back_embroidery_text) svcs.push('تطريز خلفي');
    if (s.has_purple_package) svcs.push('Purple');
    allRows.push({ serial: String(s.serial_number), name: s.name || '', size: s.size || '', scarfNum: sn, hatDesign: hatD, services: svcs.join('، '), type: 'طقم' });
  }

  for (const es of extraScarves) {
    const sn = es.scarf_design_id ? String(scarfCodeMap.get(es.scarf_design_id) || '') : '';
    const svcs: string[] = [];
    if ((es as any).has_logo_embroidery) svcs.push('شعار');
    if ((es as any).back_embroidery_text) svcs.push('تطريز خلفي');
    allRows.push({ serial: `إ${es.serial_number}`, name: es.name || '', size: '', scarfNum: sn, hatDesign: '', services: svcs.join('، '), type: 'وشاح فقط' });
  }

  let hatIdx = 0;
  for (const eh of extraHats) {
    if (eh.hat_extra_text?.trim()) {
      hatIdx++;
      allRows.push({ serial: `ق${hatIdx}`, name: '', size: '', scarfNum: '', hatDesign: `${eh.hat_embroideries?.name || ''} (${eh.hat_extra_text})`, services: '', type: 'قبعة فقط' });
    }
  }

  if (allRows.length > 0) {
    const totalNamePages = Math.ceil(allRows.length / ROWS_PER_PAGE);
    for (let pi = 0; pi < totalNamePages; pi++) {
      const p = makePage();
      let h = hdr(logoBase64) + ttl(totalNamePages > 1 ? `قائمة الأسماء (${pi + 1}/${totalNamePages})` : 'قائمة الأسماء');

      const thStyle = `padding:8px 6px;border:1px solid #ddd;font-size:11px;font-weight:700;color:white;text-align:center;`;
      const tdStyle = (bg: string) => `padding:6px;border:1px solid #eee;font-size:11px;text-align:center;background:${bg};`;

      h += `<table style="width:100%;border-collapse:collapse;">`;
      h += `<thead><tr style="background:${BRAND_COLOR};">`;
      h += `<th style="${thStyle}">#</th><th style="${thStyle}">الاسم</th><th style="${thStyle}">المقاس</th>`;
      h += `<th style="${thStyle}">الوشاح</th><th style="${thStyle}">القبعة</th>`;
      h += `<th style="${thStyle}">الخدمات</th><th style="${thStyle}">النوع</th>`;
      h += `</tr></thead><tbody>`;

      const pageRows = allRows.slice(pi * ROWS_PER_PAGE, (pi + 1) * ROWS_PER_PAGE);
      pageRows.forEach((r, i) => {
        const bg = i % 2 === 0 ? '#fff' : '#f8f8fa';
        h += `<tr>`;
        h += `<td style="${tdStyle(bg)}font-weight:600;">${r.serial}</td>`;
        h += `<td style="${tdStyle(bg)}text-align:right;padding-right:10px;">${r.name}</td>`;
        h += `<td style="${tdStyle(bg)}">${r.size}</td>`;
        h += `<td style="${tdStyle(bg)}">`;
        if (r.scarfNum) h += `<span style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:${BRAND_COLOR};color:white;font-weight:700;font-size:10px;">${r.scarfNum}</span>`;
        h += `</td>`;
        h += `<td style="${tdStyle(bg)}">`;
        if (r.hatDesign) h += `<span style="display:inline-block;padding:2px 8px;border-radius:12px;background:${BRAND_COLOR};color:white;font-size:10px;">${r.hatDesign}</span>`;
        h += `</td>`;
        h += `<td style="${tdStyle(bg)}font-size:10px;">${r.services}</td>`;
        h += `<td style="${tdStyle(bg)}">${r.type}</td>`;
        h += `</tr>`;
      });
      h += `</tbody></table>`;
      p.innerHTML = h;
      pages.push(p);
    }
  }

  // ════════════════════════════════════════
  // PAGE: Shipping
  // ════════════════════════════════════════
  if (order.recipient_name || order.recipient_phone || shippingCityName) {
    const p = makePage();
    let h = hdr(logoBase64) + ttl('بيانات الشحن');
    h += `<div style="max-width:450px;margin:0 auto;background:#fafafa;border-radius:12px;padding:20px;">`;
    if (order.recipient_name) h += row('اسم المستلم', order.recipient_name);
    if (order.recipient_phone) h += row('رقم الجوال', order.recipient_phone);
    if (shippingCityName) h += row('المدينة', shippingCityName);
    if (order.district) h += row('الحي', order.district);
    if (order.address_details) h += row('تفاصيل العنوان', order.address_details);
    if (order.national_address) h += row('العنوان الوطني', order.national_address);
    h += `</div>`;
    p.innerHTML = h;
    pages.push(p);
  }

  // ════════════════════════════════════════
  // PAGE: Thank You
  // ════════════════════════════════════════
  const pTy = makePage();
  pTy.innerHTML = `
    ${hdr(logoBase64)}
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:${A4_H - 250}px;">
      <div style="width:60px;height:60px;border-radius:50%;background:${BRAND_COLOR}15;display:flex;align-items:center;justify-content:center;margin-bottom:24px;">
        <span style="font-size:28px;">✨</span>
      </div>
      <h2 style="font-size:26px;font-weight:700;color:${BRAND_COLOR};margin:0 0 12px;">شكراً لكم</h2>
      <p style="font-size:15px;color:#888;text-align:center;max-width:380px;line-height:1.8;margin:0;">نشكركم على ثقتكم بمتجر Areba ونسعد بخدمتكم دائماً</p>
      <div style="margin-top:32px;width:60px;height:3px;background:linear-gradient(to right,${BRAND_COLOR},#8B5CF6);border-radius:2px;"></div>
    </div>
  `;
  pages.push(pTy);

  // ════════════════════════════════════════
  // CAPTURE & GENERATE PDF
  // ════════════════════════════════════════
  const doc = new jsPDF({ orientation: 'portrait', unit: 'px', format: [A4_W, A4_H] });

  for (let i = 0; i < pages.length; i++) {
    if (i > 0) doc.addPage([A4_W, A4_H]);
    const canvas = await capture(pages[i]);
    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    doc.addImage(imgData, 'JPEG', 0, 0, A4_W, A4_H);
  }

  doc.save(`order-${order.order_number || orderId}.pdf`);
  document.head.removeChild(fontLink);
}
