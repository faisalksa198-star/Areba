import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase } from '@/integrations/supabase/client';

const A4_W = 794;
const A4_H = 1123;
const PAD = 40;
const BRAND = '#440376';
const BRAND_LIGHT = '#6B21A8';
const BG_GRADIENT = 'linear-gradient(180deg, #fefcff 0%, #f8f5ff 40%, #f3f0fa 70%, #fefcff 100%)';

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
    <div style="background:linear-gradient(135deg,${BRAND},${BRAND_LIGHT});border-radius:10px;padding:14px 24px;text-align:center;line-height:1.8;">
      <span style="color:white;font-size:16px;font-weight:700;letter-spacing:0.5px;font-family:Tajawal,sans-serif;">${text}</span>
    </div>
  </div>`;
}

function row(label: string, value: string): string {
  return `<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 14px;border-bottom:1px solid #ede9f5;line-height:1.8;">
    <span style="color:#8b7fa8;font-size:12px;font-family:Tajawal,sans-serif;">${label}</span>
    <span style="font-weight:600;font-size:12px;color:#2d1b4e;font-family:Tajawal,sans-serif;">${value}</span>
  </div>`;
}

function makePage(): HTMLDivElement {
  const d = document.createElement('div');
  d.style.cssText = `width:${A4_W}px;min-height:${A4_H}px;background:${BG_GRADIENT};padding:${PAD}px;font-family:Tajawal,sans-serif;direction:rtl;position:absolute;left:-9999px;top:0;box-sizing:border-box;color:#333;line-height:1.8;`;
  return d;
}

async function capture(page: HTMLDivElement): Promise<HTMLCanvasElement> {
  document.body.appendChild(page);
  await new Promise(r => setTimeout(r, 150));
  const canvas = await html2canvas(page, { scale: 2, useCORS: true, backgroundColor: null, logging: false });
  document.body.removeChild(page);
  return canvas;
}

function badge(text: string, size = 28): string {
  return `<span style="display:inline-flex;align-items:center;justify-content:center;min-width:${size}px;height:${size}px;border-radius:6px;background:linear-gradient(135deg,${BRAND},${BRAND_LIGHT});color:white;font-weight:700;font-size:${Math.floor(size * 0.42)}px;line-height:1;padding:0 6px;font-family:Tajawal,sans-serif;">${text}</span>`;
}

export async function generateOrderPdf(orderId: string): Promise<void> {
  const fontLink = document.createElement('link');
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap';
  fontLink.rel = 'stylesheet';
  document.head.appendChild(fontLink);
  await document.fonts.ready;
  await new Promise(r => setTimeout(r, 300));

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
  const abayaColor = isKit ? kit?.abaya_color : order.custom_abaya_color;
  const scarfColor = isKit ? kit?.scarf_color : order.custom_scarf_color;
  const hatColor = isKit ? kit?.hat_color : order.custom_hat_color;
  const sleeveColor = isKit ? (kit?.sleeve_color || '') : (order.sleeve_color || '');
  const sleeveStyle = isKit ? kit?.sleeve_styles : order.sleeve_styles;

  let shippingCityName = '';
  if (order.shipping_city_id) {
    const { data: cityData } = await supabase.from('cities').select('name').eq('id', order.shipping_city_id).single();
    shippingCityName = cityData?.name || '';
  }

  const logoBase64 = await toBase64(window.location.origin + '/logo.svg');

  // Preload scarf images (style + date_type)
  const scarfStyleImgs = new Map<string, string>();
  const scarfDateImgs = new Map<string, string>();
  for (const sd of scarfDesigns) {
    if (sd.scarf_styles?.image_url) scarfStyleImgs.set(sd.id, await toBase64(sd.scarf_styles.image_url));
    if (sd.date_types?.image_url) scarfDateImgs.set(sd.id, await toBase64(sd.date_types.image_url));
  }

  // Preload hat images
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
  // PAGE 1: Order Info + Abaya Details (merged)
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
  h1 += `</div>`;

  // Abaya details merged into bottom of page 1
  if (sc > 0 && (abayaColor || sleeveStyle || sleeveColor)) {
    h1 += `<div style="margin-top:24px;">` + sectionTitle('تفاصيل العباية') + `</div>`;
    h1 += `<div style="max-width:480px;margin:0 auto;background:#fff;border-radius:14px;padding:18px;border:1px solid #ede9f5;box-shadow:0 2px 12px rgba(68,3,118,0.04);">`;
    if (abayaColor) h1 += row('لون العباية', abayaColor);
    if (order.abaya_length) h1 += row('طول العباية', order.abaya_length);
    if (sleeveStyle?.name) h1 += row('طرف الكم', sleeveStyle.name);
    if (sleeveColor) h1 += row('لون طرف الكم', sleeveColor);
    h1 += `</div>`;
  }
  p1.innerHTML = h1;
  pages.push(p1);

  // ══════════════════════════════════════
  // PAGE: Scarves — two-image boxes with badge numbering
  // ══════════════════════════════════════
  if (scarfDesigns.length > 0) {
    const p = makePage();
    let h = hdr(logoBase64) + sectionTitle('تصاميم الأوشحة');

    if (scarfColor) {
      h += `<div style="text-align:center;margin-bottom:18px;font-size:13px;color:#6b5b8a;font-family:Tajawal,sans-serif;line-height:1.8;">لون الوشاح: <strong style="color:#2d1b4e;">${scarfColor}</strong></div>`;
    }

    // Embroidery services for scarves section
    if (order.logo_embroidery_enabled || order.back_embroidery_enabled) {
      h += `<div style="max-width:420px;margin:0 auto 18px;background:#fff;border-radius:14px;padding:14px;border:1px solid #ede9f5;">`;
      h += `<p style="font-size:13px;font-weight:700;color:${BRAND};margin:0 0 8px;line-height:1.8;font-family:Tajawal,sans-serif;">خدمات التطريز</p>`;
      if (order.logo_embroidery_enabled && order.logo_embroidery_count) h += row('تطريز الشعار', `${order.logo_embroidery_count}`);
      if (order.back_embroidery_enabled && order.back_embroidery_count) h += row('التطريز الخلفي', `${order.back_embroidery_count}`);
      h += `</div>`;
    }

    h += `<div style="display:flex;flex-wrap:wrap;gap:16px;justify-content:center;">`;
    scarfDesigns.forEach((sd: any, i: number) => {
      const styleImg = scarfStyleImgs.get(sd.id);
      const dateImg = scarfDateImgs.get(sd.id);

      h += `<div style="width:360px;border:1px solid #ede9f5;border-radius:14px;overflow:hidden;background:#fff;box-shadow:0 2px 10px rgba(68,3,118,0.04);">`;
      // Badge number header
      h += `<div style="padding:10px 14px;display:flex;align-items:center;gap:10px;border-bottom:1px solid #ede9f5;">
        ${badge(String(i + 1), 30)}
        <span style="font-weight:700;font-size:14px;color:${BRAND};font-family:Tajawal,sans-serif;">وشاح ${i + 1}</span>
      </div>`;

      // Two images side by side: right=scarf style (wide), left=date type (tall)
      h += `<div style="display:flex;padding:12px;gap:10px;justify-content:center;">`;
      if (styleImg) {
        h += `<div style="flex:1;max-width:180px;height:160px;border-radius:10px;overflow:hidden;border:1px solid #ede9f5;display:flex;align-items:center;justify-content:center;background:#faf8ff;">
          <img src="${styleImg}" style="max-width:170px;max-height:150px;object-fit:contain;" />
        </div>`;
      }
      if (dateImg) {
        h += `<div style="width:100px;height:160px;border-radius:10px;overflow:hidden;border:1px solid #ede9f5;display:flex;align-items:center;justify-content:center;background:#faf8ff;">
          <img src="${dateImg}" style="max-width:90px;max-height:150px;object-fit:contain;" />
        </div>`;
      }
      h += `</div>`;

      // Details
      h += `<div style="padding:6px 14px 12px;">`;
      const detail = (l: string, v: string) => { if (v) h += `<p style="font-size:11px;color:#6b5b8a;margin:3px 0;line-height:1.8;font-family:Tajawal,sans-serif;">${l}: <strong style="color:#2d1b4e;">${v}</strong></p>`; };
      detail('التصميم', sd.scarf_styles?.name);
      detail('الطرف', sd.scarf_methods?.name);
      detail('اتجاه التطريز', sd.embroidery_directions?.name);
      detail('التاريخ', sd.date_types?.name);
      detail('الخط', sd.fonts?.name);
      detail('لون التطريز', sd.embroidery_color);
      h += `</div></div>`;
    });
    h += `</div>`;
    p.innerHTML = h;
    pages.push(p);
  }

  // ══════════════════════════════════════
  // PAGE: Hats — improved image handling, badge numbering, hat embroidery count
  // ══════════════════════════════════════
  const hasHats = students.some((s: any) => s.hat_embroidery_id) || extraHats.length > 0;
  if (hasHats) {
    const p = makePage();
    let h = hdr(logoBase64) + sectionTitle('تصاميم القبعات');

    if (hatColor) {
      h += `<div style="text-align:center;margin-bottom:14px;font-size:13px;color:#6b5b8a;font-family:Tajawal,sans-serif;line-height:1.8;">لون القبعة: <strong style="color:#2d1b4e;">${hatColor}</strong></div>`;
    }

    // Hat embroidery count
    if (order.hat_embroidery_enabled && order.hat_embroidery_count) {
      h += `<div style="max-width:420px;margin:0 auto 18px;background:#fff;border-radius:14px;padding:14px;border:1px solid #ede9f5;">`;
      h += row('عدد تطريز القبعات', `${order.hat_embroidery_count}`);
      h += `</div>`;
    }

    // Group hats by design name
    const groups = new Map<string, { name: string; img: string; count: number; fringes: string[] }>();
    for (const st of students) {
      if (!st.hat_embroidery_id) continue;
      const hn = st.hat_embroideries?.name || '';
      if (hn === 'بدون تطريز') continue;
      const img = hatImgs.get(st.hat_embroidery_id) || '';
      const ex = groups.get(hn);
      if (ex) ex.count++; else groups.set(hn, { name: hn, img, count: 1, fringes: [] });
    }
    for (const eh of extraHats) {
      if (!eh.hat_embroidery_id) continue;
      const hn = eh.hat_embroideries?.name || '';
      if (hn === 'بدون تطريز') continue;
      const img = hatImgs.get(eh.hat_embroidery_id) || '';
      const fc = eh.fringe_color || '';
      const ex = groups.get(hn);
      if (ex) { ex.count++; if (fc && !ex.fringes.includes(fc)) ex.fringes.push(fc); }
      else groups.set(hn, { name: hn, img, count: 1, fringes: fc ? [fc] : [] });
    }

    h += `<div style="display:flex;flex-wrap:wrap;gap:16px;justify-content:center;">`;
    for (const g of groups.values()) {
      h += `<div style="width:320px;display:flex;border:1px solid #ede9f5;border-radius:14px;overflow:hidden;background:#fff;box-shadow:0 2px 10px rgba(68,3,118,0.04);">`;
      if (g.img) {
        h += `<div style="width:120px;min-height:130px;display:flex;align-items:center;justify-content:center;background:#faf8ff;border-left:1px solid #ede9f5;">
          <img src="${g.img}" style="max-width:100px;max-height:110px;object-fit:contain;" />
        </div>`;
      }
      h += `<div style="flex:1;padding:12px;line-height:1.8;">`;
      h += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <span style="font-weight:700;font-size:13px;color:${BRAND};font-family:Tajawal,sans-serif;">${g.name}</span>
      </div>`;
      h += `<p style="font-size:11px;color:#6b5b8a;margin:4px 0;font-family:Tajawal,sans-serif;">الكمية: <strong style="color:#2d1b4e;">${g.count}</strong></p>`;
      if (g.fringes.length > 0) h += `<p style="font-size:11px;color:#6b5b8a;margin:4px 0;font-family:Tajawal,sans-serif;">الهدب: <strong style="color:#2d1b4e;">${g.fringes.join('، ')}</strong></p>`;
      h += `</div></div>`;
    }
    h += `</div>`;
    p.innerHTML = h;
    pages.push(p);
  }

  // ══════════════════════════════════════
  // PAGES: Names Table — Dynamic columns, no "type" column
  // ══════════════════════════════════════
  const ROWS_PER_PAGE = 18;
  const scarfCodeMap = new Map<string, number>();
  scarfDesigns.forEach((sd: any, i: number) => scarfCodeMap.set(sd.id, i + 1));

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

      const thS = `padding:10px 6px;border:1px solid #d8cef0;font-size:10px;font-weight:700;color:white;text-align:center;vertical-align:middle;line-height:1.8;font-family:Tajawal,sans-serif;`;
      const tdS = (bg: string) => `padding:8px 6px;border:1px solid #ede9f5;font-size:10px;text-align:center;vertical-align:middle;background:${bg};line-height:1.8;font-family:Tajawal,sans-serif;`;

      h += `<table style="width:100%;border-collapse:collapse;">`;
      h += `<thead><tr style="background:linear-gradient(135deg,${BRAND},${BRAND_LIGHT});">`;
      h += `<th style="${thS}width:30px;">#</th><th style="${thS}">الاسم</th><th style="${thS}width:40px;">المقاس</th>`;
      h += `<th style="${thS}width:50px;">الوشاح</th>`;
      if (hasHatTextCol) h += `<th style="${thS}width:110px;">القبعة</th>`;
      if (hasBackCol) h += `<th style="${thS}width:95px;">تطريز خلفي</th>`;
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
        if (r.scarfNum) h += badge(r.scarfNum, 24);
        h += `</td>`;
        if (hasHatTextCol) {
          h += `<td style="${tdS(bg)}">`;
          if (r.hatDesignNum) {
            h += `<div style="display:flex;align-items:center;justify-content:center;gap:4px;">`;
            h += badge(r.hatDesignNum, 22);
            if (r.hatExtraText) h += `<span style="font-size:9px;color:#6b5b8a;font-family:Tajawal,sans-serif;">(${r.hatExtraText})</span>`;
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
  // PAGE: Shipping + Thank You (merged)
  // ══════════════════════════════════════
  const hasShipping = order.recipient_name || order.recipient_phone || shippingCityName;
  {
    const p = makePage();
    let h = hdr(logoBase64);

    if (hasShipping) {
      h += sectionTitle('بيانات الشحن');
      h += `<div style="max-width:450px;margin:0 auto;background:#fff;border-radius:14px;padding:20px;border:1px solid #ede9f5;">`;
      if (order.recipient_name) h += row('اسم المستلم', order.recipient_name);
      if (order.recipient_phone) h += row('رقم الجوال', order.recipient_phone);
      if (shippingCityName) h += row('المدينة', shippingCityName);
      if (order.district) h += row('الحي', order.district);
      if (order.address_details) h += row('تفاصيل العنوان', order.address_details);
      if (order.national_address) h += row('العنوان الوطني', order.national_address);
      h += `</div>`;
    }

    // Thank you section merged
    h += `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;margin-top:${hasShipping ? '60' : '200'}px;">
      <div style="width:70px;height:70px;border-radius:50%;background:linear-gradient(135deg,${BRAND}15,${BRAND_LIGHT}20);display:flex;align-items:center;justify-content:center;margin-bottom:24px;border:2px solid ${BRAND}20;">
        <span style="font-size:32px;">✨</span>
      </div>
      <h2 style="font-size:26px;font-weight:700;color:${BRAND};margin:0 0 12px;font-family:Tajawal,sans-serif;">شكراً لكم</h2>
      <p style="font-size:14px;color:#8b7fa8;text-align:center;max-width:380px;line-height:2;margin:0;font-family:Tajawal,sans-serif;">نشكركم على ثقتكم بمتجر Areba ونسعد بخدمتكم دائماً</p>
      <div style="margin-top:32px;width:80px;height:3px;background:linear-gradient(to right,${BRAND},${BRAND_LIGHT});border-radius:2px;"></div>
    </div>`;
    p.innerHTML = h;
    pages.push(p);
  }

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
