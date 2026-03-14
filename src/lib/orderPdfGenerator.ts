import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase } from '@/integrations/supabase/client';

const A4_W = 794;
const A4_H = 1123;
const PAD = 40;
const BRAND = '#440376';
const BRAND_LIGHT = '#6B21A8';
const BG_GRADIENT = 'linear-gradient(180deg, #faf8ff 0%, #f3f0ff 50%, #faf8ff 100%)';

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
  return `<div style="text-align:center;margin-bottom:18px;padding-bottom:10px;border-bottom:2px solid ${BRAND}20;">
    <img src="${logo}" style="height:30px;" />
  </div>`;
}

function sectionTitle(text: string): string {
  return `<div style="margin:0 auto 18px;max-width:520px;">
    <div style="background:linear-gradient(135deg,${BRAND},${BRAND_LIGHT});border-radius:10px;padding:10px 24px;text-align:center;">
      <span style="color:white;font-size:16px;font-weight:700;letter-spacing:0.5px;">${text}</span>
    </div>
  </div>`;
}

function row(label: string, value: string): string {
  return `<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 14px;border-bottom:1px solid #ede9f5;">
    <span style="color:#8b7fa8;font-size:12px;">${label}</span>
    <span style="font-weight:600;font-size:12px;color:#2d1b4e;">${value}</span>
  </div>`;
}

function makePage(): HTMLDivElement {
  const d = document.createElement('div');
  d.style.cssText = `width:${A4_W}px;min-height:${A4_H}px;background:${BG_GRADIENT};padding:${PAD}px;font-family:Tajawal,Arial,sans-serif;direction:rtl;position:absolute;left:-9999px;top:0;box-sizing:border-box;color:#333;`;
  return d;
}

async function capture(page: HTMLDivElement): Promise<HTMLCanvasElement> {
  document.body.appendChild(page);
  await new Promise(r => setTimeout(r, 150));
  const canvas = await html2canvas(page, { scale: 2, useCORS: true, backgroundColor: null, logging: false });
  document.body.removeChild(page);
  return canvas;
}

function imgBox(src: string, w = 200, h = 240): string {
  return `<div style="border-radius:14px;overflow:hidden;border:1px solid #e8e0f4;box-shadow:0 3px 16px rgba(68,3,118,0.07);background:#fff;width:${w}px;height:${h}px;display:flex;align-items:center;justify-content:center;">
    <img src="${src}" style="max-width:${w - 16}px;max-height:${h - 16}px;object-fit:contain;display:block;" />
  </div>`;
}

function circle(text: string, size = 28): string {
  return `<span style="display:inline-flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:50%;background:${BRAND};color:white;font-weight:700;font-size:${Math.floor(size * 0.4)}px;line-height:1;">${text}</span>`;
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

  let shippingCityName = '';
  if (order.shipping_city_id) {
    const { data: cityData } = await supabase.from('cities').select('name').eq('id', order.shipping_city_id).single();
    shippingCityName = cityData?.name || '';
  }

  // Convert images to base64
  const logoBase64 = await toBase64(window.location.origin + '/logo.svg');
  const abayaImg = await toBase64(abayaDesign?.image_url || '');
  const sleeveImg = await toBase64(sleeveStyle?.image_url || '');

  const scarfImgs = new Map<string, string>();
  for (const sd of scarfDesigns) {
    if (sd.scarf_styles?.image_url) scarfImgs.set(sd.id, await toBase64(sd.scarf_styles.image_url));
  }

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

  // ══════════════════════════════════════
  // PAGE 1: Order Info
  // ══════════════════════════════════════
  const p1 = makePage();
  let h1 = hdr(logoBase64) + sectionTitle('بيانات الطلب');
  h1 += `<div style="max-width:480px;margin:0 auto;background:#fff;border-radius:14px;padding:18px;border:1px solid #ede9f5;box-shadow:0 2px 12px rgba(68,3,118,0.04);">`;
  const addIf = (l: string, v: any) => { if (v && v !== 0) h1 += row(l, String(v)); };
  addIf('رقم الطلب', order.order_number);
  addIf('تاريخ الطلب', order.created_at ? new Date(order.created_at).toLocaleDateString('ar-SA') : '');
  addIf('مدة التنفيذ (أيام)', (order as any).execution_duration);
  addIf('اسم القائدة', order.leader_name);
  addIf('اسم المدرسة', order.school_name);
  addIf('نوع الطلب', isKit ? 'طقم جاهز' : 'تفصيل');
  if (isKit && kit?.name) addIf('اسم الطقم', kit.name);
  if (sc) addIf('عدد الأطقم', sc);
  if (esc) addIf('الأوشحة الإضافية', esc);
  if (ehc) addIf('القبعات الإضافية', ehc);
  if (order.logo_embroidery_count) addIf('عدد تطريز الشعار', order.logo_embroidery_count);
  if (order.back_embroidery_count) addIf('عدد التطريز الخلفي', order.back_embroidery_count);
  if (order.hat_embroidery_count) addIf('عدد تطريز القبعات', order.hat_embroidery_count);
  if (order.purple_package_count) addIf('عدد بكج Purple', order.purple_package_count);
  h1 += `</div>`;
  p1.innerHTML = h1;
  pages.push(p1);

  // ══════════════════════════════════════
  // PAGE 2: Abaya
  // ══════════════════════════════════════
  if (sc > 0 && (abayaDesign || abayaColor)) {
    const p = makePage();
    let h = hdr(logoBase64) + sectionTitle('تفاصيل العباية');
    h += `<div style="display:flex;flex-direction:column;align-items:center;gap:20px;">`;
    if (abayaImg) h += imgBox(abayaImg, 260, 340);
    h += `<div style="max-width:420px;width:100%;background:#fff;border-radius:14px;padding:16px;border:1px solid #ede9f5;">`;
    if (abayaDesign?.name) h += row('تصميم العباية', abayaDesign.name);
    if (abayaColor) h += row('لون العباية', [abayaColor, abayaColorDeg].filter(Boolean).join(' - '));
    if (order.abaya_length) h += row('طول العباية', order.abaya_length);
    if (sleeveStyle?.name) h += row('طرف الكم', sleeveStyle.name);
    if (sleeveColor) h += row('لون طرف الكم', sleeveColor);
    h += `</div>`;
    if (sleeveImg) h += imgBox(sleeveImg, 180, 180);
    h += `</div>`;
    p.innerHTML = h;
    pages.push(p);
  }

  // ══════════════════════════════════════
  // PAGE 3: Scarves — numbered boxes
  // ══════════════════════════════════════
  if (scarfDesigns.length > 0) {
    const p = makePage();
    let h = hdr(logoBase64) + sectionTitle('تصاميم الأوشحة');
    h += `<div style="display:flex;flex-wrap:wrap;gap:16px;justify-content:center;">`;
    scarfDesigns.forEach((sd: any, i: number) => {
      const img = scarfImgs.get(sd.id);
      h += `<div style="width:340px;display:flex;border:1px solid #ede9f5;border-radius:14px;overflow:hidden;background:#fff;box-shadow:0 2px 10px rgba(68,3,118,0.04);">`;
      // Left: image
      if (img) {
        h += `<div style="width:140px;min-height:160px;display:flex;align-items:center;justify-content:center;background:#faf8ff;border-left:1px solid #ede9f5;">
          <img src="${img}" style="max-width:120px;max-height:140px;object-fit:contain;" />
        </div>`;
      }
      // Right: details
      h += `<div style="flex:1;padding:12px;">`;
      h += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        ${circle(String(i + 1), 30)}
        <span style="font-weight:700;font-size:14px;color:${BRAND};">وشاح ${i + 1}</span>
      </div>`;
      const detail = (l: string, v: string) => { if (v) h += `<p style="font-size:11px;color:#6b5b8a;margin:4px 0;line-height:1.6;">${l}: <strong style="color:#2d1b4e;">${v}</strong></p>`; };
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
      h += `<div style="margin-top:24px;max-width:420px;margin-left:auto;margin-right:auto;background:#fff;border-radius:14px;padding:16px;border:1px solid #ede9f5;">`;
      h += `<p style="font-size:13px;font-weight:700;color:${BRAND};margin:0 0 8px;">خدمات التطريز</p>`;
      if (order.logo_embroidery_enabled) h += row('تطريز الشعار', `${order.logo_embroidery_count || 0}`);
      if (order.back_embroidery_enabled) h += row('التطريز الخلفي', `${order.back_embroidery_count || 0}`);
      h += `</div>`;
    }

    if (scarfColor) {
      h += `<div style="text-align:center;margin-top:14px;font-size:12px;color:#6b5b8a;">لون الوشاح: <strong style="color:#2d1b4e;">${[scarfColor, scarfColorDeg].filter(Boolean).join(' - ')}</strong></div>`;
    }

    p.innerHTML = h;
    pages.push(p);
  }

  // ══════════════════════════════════════
  // PAGE 4: Hats — numbered boxes
  // ══════════════════════════════════════
  const hasHats = students.some((s: any) => s.hat_embroidery_id) || extraHats.length > 0;
  if (hasHats) {
    const p = makePage();
    let h = hdr(logoBase64) + sectionTitle('تصاميم القبعات');

    if (hatColor) {
      h += `<div style="text-align:center;margin-bottom:18px;font-size:13px;color:#6b5b8a;">لون القبعة: <strong style="color:#2d1b4e;">${[hatColor, hatColorDeg].filter(Boolean).join(' - ')}</strong></div>`;
    }

    // Group hats
    const groups = new Map<string, { name: string; img: string; count: number; fringes: string[] }>();
    let gIdx = 0;
    for (const st of students) {
      if (!st.hat_embroidery_id) continue;
      const hn = st.hat_embroideries?.name || '';
      if (hn === 'بدون تطريز') continue;
      const img = hatImgs.get(st.hat_embroidery_id) || '';
      const key = hn;
      const ex = groups.get(key);
      if (ex) ex.count++; else groups.set(key, { name: hn, img, count: 1, fringes: [] });
    }
    for (const eh of extraHats) {
      if (!eh.hat_embroidery_id) continue;
      const hn = eh.hat_embroideries?.name || '';
      if (hn === 'بدون تطريز') continue;
      const img = hatImgs.get(eh.hat_embroidery_id) || '';
      const fc = eh.fringe_color || '';
      const key = `${hn}||${fc}`;
      const ex = groups.get(key);
      if (ex) { ex.count++; if (fc && !ex.fringes.includes(fc)) ex.fringes.push(fc); }
      else groups.set(key, { name: hn, img, count: 1, fringes: fc ? [fc] : [] });
    }

    h += `<div style="display:flex;flex-wrap:wrap;gap:16px;justify-content:center;">`;
    gIdx = 0;
    for (const g of groups.values()) {
      gIdx++;
      h += `<div style="width:320px;display:flex;border:1px solid #ede9f5;border-radius:14px;overflow:hidden;background:#fff;box-shadow:0 2px 10px rgba(68,3,118,0.04);">`;
      if (g.img) {
        h += `<div style="width:120px;min-height:130px;display:flex;align-items:center;justify-content:center;background:#faf8ff;border-left:1px solid #ede9f5;">
          <img src="${g.img}" style="max-width:100px;max-height:110px;object-fit:contain;" />
        </div>`;
      }
      h += `<div style="flex:1;padding:12px;">`;
      h += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        ${circle(String(gIdx), 28)}
        <span style="font-weight:700;font-size:13px;color:${BRAND};">${g.name}</span>
      </div>`;
      h += `<p style="font-size:11px;color:#6b5b8a;margin:4px 0;">الكمية: <strong style="color:#2d1b4e;">${g.count}</strong></p>`;
      if (g.fringes.length > 0) h += `<p style="font-size:11px;color:#6b5b8a;margin:4px 0;">الهدب: <strong style="color:#2d1b4e;">${g.fringes.join('، ')}</strong></p>`;
      h += `</div></div>`;
    }
    h += `</div>`;
    p.innerHTML = h;
    pages.push(p);
  }

  // ══════════════════════════════════════
  // PAGE 5+: Names Table (paginated) — Dynamic columns
  // ══════════════════════════════════════
  const ROWS_PER_PAGE = 18;
  const scarfCodeMap = new Map<string, number>();
  scarfDesigns.forEach((sd: any, i: number) => scarfCodeMap.set(sd.id, i + 1));

  // Determine which dynamic columns to show
  const hasBackCol = students.some(s => s.back_embroidery_text?.trim()) || extraScarves.some(s => s.back_embroidery_text?.trim());
  const hasLogoCol = students.some(s => s.has_logo_embroidery) || extraScarves.some(s => s.has_logo_embroidery);
  const hasHatTextCol = students.some(s => {
    const hn = s.hat_embroideries?.name || '';
    return hn !== 'بدون تطريز' && s.hat_embroidery_id;
  }) || extraHats.some(h => h.hat_embroidery_id && h.hat_embroideries?.name !== 'بدون تطريز');

  interface NameRow {
    serial: string; name: string; size: string; scarfNum: string;
    hatDesignNum: string; hatDesignName: string; hatExtraText: string;
    backText: string; hasLogo: boolean;
  }
  const allRows: NameRow[] = [];

  // Build hat design number map
  const hatDesignOrder: string[] = [];
  const hatDesignMap = new Map<string, number>();
  for (const s of students) {
    if (!s.hat_embroidery_id) continue;
    const hn = s.hat_embroideries?.name || '';
    if (hn === 'بدون تطريز') continue;
    if (!hatDesignMap.has(hn)) {
      hatDesignOrder.push(hn);
      hatDesignMap.set(hn, hatDesignOrder.length);
    }
  }
  for (const eh of extraHats) {
    if (!eh.hat_embroidery_id) continue;
    const hn = eh.hat_embroideries?.name || '';
    if (hn === 'بدون تطريز') continue;
    if (!hatDesignMap.has(hn)) {
      hatDesignOrder.push(hn);
      hatDesignMap.set(hn, hatDesignOrder.length);
    }
  }

  for (const s of students) {
    const sn = s.scarf_design_id ? String(scarfCodeMap.get(s.scarf_design_id) || '') : '';
    const hn = s.hat_embroideries?.name || '';
    const isNone = hn === 'بدون تطريز' || !s.hat_embroidery_id;
    const hatNum = isNone ? '' : String(hatDesignMap.get(hn) || '');
    const hatName = isNone ? '' : hn;
    allRows.push({
      serial: String(s.serial_number), name: s.name || '', size: s.size || '',
      scarfNum: sn, hatDesignNum: hatNum, hatDesignName: hatName,
      hatExtraText: s.hat_extra_text || '',
      backText: s.back_embroidery_text || '', hasLogo: s.has_logo_embroidery || false,
    });
  }

  for (const es of extraScarves) {
    const sn = es.scarf_design_id ? String(scarfCodeMap.get(es.scarf_design_id) || '') : '';
    allRows.push({
      serial: `إ${es.serial_number}`, name: es.name || '', size: '',
      scarfNum: sn, hatDesignNum: '', hatDesignName: '', hatExtraText: '',
      backText: es.back_embroidery_text || '', hasLogo: es.has_logo_embroidery || false,
    });
  }

  // Extra hats with text
  let hatIdx = 0;
  for (const eh of extraHats) {
    if (eh.hat_extra_text?.trim()) {
      hatIdx++;
      const hn = eh.hat_embroideries?.name || '';
      const hatNum = hatDesignMap.get(hn) || '';
      allRows.push({
        serial: `ق${hatIdx}`, name: '', size: '',
        scarfNum: '', hatDesignNum: String(hatNum), hatDesignName: hn,
        hatExtraText: eh.hat_extra_text || '',
        backText: '', hasLogo: false,
      });
    }
  }

  if (allRows.length > 0) {
    const totalNamePages = Math.ceil(allRows.length / ROWS_PER_PAGE);
    for (let pi = 0; pi < totalNamePages; pi++) {
      const p = makePage();
      let h = hdr(logoBase64) + sectionTitle(totalNamePages > 1 ? `قائمة الأسماء (${pi + 1}/${totalNamePages})` : 'قائمة الأسماء');

      const thS = `padding:8px 6px;border:1px solid #d8cef0;font-size:10px;font-weight:700;color:white;text-align:center;vertical-align:middle;`;
      const tdS = (bg: string) => `padding:7px 6px;border:1px solid #ede9f5;font-size:10px;text-align:center;vertical-align:middle;background:${bg};`;

      h += `<table style="width:100%;border-collapse:collapse;">`;
      h += `<thead><tr style="background:linear-gradient(135deg,${BRAND},${BRAND_LIGHT});">`;
      h += `<th style="${thS}width:30px;">#</th><th style="${thS}">الاسم</th><th style="${thS}width:40px;">المقاس</th>`;
      h += `<th style="${thS}width:45px;">الوشاح</th>`;
      if (hasHatTextCol) h += `<th style="${thS}width:100px;">القبعة</th>`;
      if (hasBackCol) h += `<th style="${thS}width:90px;">تطريز خلفي</th>`;
      if (hasLogoCol) h += `<th style="${thS}width:40px;">شعار</th>`;
      h += `</tr></thead><tbody>`;

      const pageRows = allRows.slice(pi * ROWS_PER_PAGE, (pi + 1) * ROWS_PER_PAGE);
      pageRows.forEach((r, i) => {
        const bg = i % 2 === 0 ? '#fff' : '#faf8ff';
        h += `<tr>`;
        h += `<td style="${tdS(bg)}font-weight:700;color:${BRAND};">${r.serial}</td>`;
        h += `<td style="${tdS(bg)}text-align:right;padding-right:10px;color:#2d1b4e;">${r.name}</td>`;
        h += `<td style="${tdS(bg)}">${r.size}</td>`;
        h += `<td style="${tdS(bg)}">`;
        if (r.scarfNum) h += circle(r.scarfNum, 24);
        h += `</td>`;
        if (hasHatTextCol) {
          h += `<td style="${tdS(bg)}">`;
          if (r.hatDesignNum) {
            h += `<div style="display:flex;align-items:center;justify-content:center;gap:4px;">`;
            h += circle(r.hatDesignNum, 22);
            if (r.hatExtraText) h += `<span style="font-size:9px;color:#6b5b8a;">(${r.hatExtraText})</span>`;
            h += `</div>`;
          }
          h += `</td>`;
        }
        if (hasBackCol) {
          h += `<td style="${tdS(bg)}font-size:9px;color:#2d1b4e;">${r.backText}</td>`;
        }
        if (hasLogoCol) {
          h += `<td style="${tdS(bg)}">`;
          if (r.hasLogo) h += `<span style="color:#16a34a;font-size:14px;font-weight:700;">✓</span>`;
          h += `</td>`;
        }
        h += `</tr>`;
      });
      h += `</tbody></table>`;
      p.innerHTML = h;
      pages.push(p);
    }
  }

  // ══════════════════════════════════════
  // PAGE: Shipping
  // ══════════════════════════════════════
  if (order.recipient_name || order.recipient_phone || shippingCityName) {
    const p = makePage();
    let h = hdr(logoBase64) + sectionTitle('بيانات الشحن');
    h += `<div style="max-width:450px;margin:0 auto;background:#fff;border-radius:14px;padding:20px;border:1px solid #ede9f5;">`;
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

  // ══════════════════════════════════════
  // PAGE: Thank You
  // ══════════════════════════════════════
  const pTy = makePage();
  pTy.innerHTML = `
    ${hdr(logoBase64)}
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:${A4_H - 250}px;">
      <div style="width:70px;height:70px;border-radius:50%;background:linear-gradient(135deg,${BRAND}15,${BRAND_LIGHT}20);display:flex;align-items:center;justify-content:center;margin-bottom:24px;border:2px solid ${BRAND}20;">
        <span style="font-size:32px;">✨</span>
      </div>
      <h2 style="font-size:26px;font-weight:700;color:${BRAND};margin:0 0 12px;">شكراً لكم</h2>
      <p style="font-size:14px;color:#8b7fa8;text-align:center;max-width:380px;line-height:1.8;margin:0;">نشكركم على ثقتكم بمتجر Areba ونسعد بخدمتكم دائماً</p>
      <div style="margin-top:32px;width:80px;height:3px;background:linear-gradient(to right,${BRAND},${BRAND_LIGHT});border-radius:2px;"></div>
    </div>
  `;
  pages.push(pTy);

  // ══════════════════════════════════════
  // CAPTURE & GENERATE PDF
  // ══════════════════════════════════════
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
