import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase } from '@/integrations/supabase/client';

const A4_W = 794;
const A4_H = 1123;
const PAD = 40;
const BRAND = '#440376';
const BRAND_LIGHT = '#6B21A8';
const BG_GRADIENT = 'linear-gradient(160deg, #fefcff 0%, #f9f6ff 30%, #f4f0fa 60%, #faf7ff 100%)';
const FONT = `'Tajawal', sans-serif`;
const TF = `text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased;`;

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

/* Compact header with logo frame for pages 2+ */
function hdr(logo: string): string {
  return `<div style="display:flex;justify-content:flex-end;align-items:center;margin-bottom:26px;padding-bottom:12px;gap:10px;border-bottom:1.5px solid ${BRAND}22;">
    <div style="flex:1;height:1.5px;background:linear-gradient(to left,${BRAND}35,transparent);border-radius:1px;margin-top:1px;"></div>
    <div style="padding:5px 10px;border:1.5px solid ${BRAND}20;border-radius:8px;background:rgba(255,255,255,0.95);box-shadow:0 2px 8px rgba(68,3,118,0.07);">
      <img src="${logo}" style="height:22px;display:block;" />
    </div>
  </div>`;
}

/* Large centered logo with card frame for page 1 */
function bigLogo(logo: string): string {
  return `<div style="text-align:center;margin-bottom:32px;padding:20px 0 24px;border-bottom:1.5px solid ${BRAND}18;">
    <div style="display:inline-block;padding:14px 22px;background:white;border-radius:18px;box-shadow:0 6px 24px rgba(68,3,118,0.10);border:1px solid ${BRAND}12;">
      <img src="${logo}" style="height:50px;" />
    </div>
    <div style="margin:14px auto 0;width:80px;height:3px;background:linear-gradient(to right,${BRAND},${BRAND_LIGHT});border-radius:2px;"></div>
  </div>`;
}

/* Section banner — pill with right-border accent */
function sectionBanner(text: string): string {
  return `<div style="display:inline-flex;align-items:center;margin:0 0 22px;padding:9px 18px 9px 22px;background:linear-gradient(135deg,${BRAND}0d,${BRAND_LIGHT}07);border-radius:12px;border-right:4px solid ${BRAND};">
    <span style="font-size:16px;font-weight:800;color:${BRAND};letter-spacing:0.5px;font-family:${FONT};line-height:1.5;${TF}">${text}</span>
  </div>`;
}

function row(label: string, value: string): string {
  return `<div style="display:flex;justify-content:space-between;align-items:center;padding:11px 16px;border-bottom:1px solid #ede9f5;line-height:2;">
    <span style="color:#8b7fa8;font-size:12px;font-family:${FONT};${TF}">${label}</span>
    <span style="font-weight:600;font-size:12px;color:#2d1b4e;font-family:${FONT};${TF}">${value}</span>
  </div>`;
}

function card(content: string): string {
  return `<div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:18px;border:1px solid ${BRAND}14;box-shadow:0 4px 20px rgba(68,3,118,0.06),0 1px 4px rgba(68,3,118,0.03);overflow:hidden;">${content}</div>`;
}

/* Returns outer page div + inner content div.
   Outer holds decorative corner accents & watermark.
   Caller sets innerHTML on inner only. */
function makePage(logoBase64 = ''): { outer: HTMLDivElement; inner: HTMLDivElement } {
  const outer = document.createElement('div');
  outer.style.cssText = `width:${A4_W}px;min-height:${A4_H}px;background:${BG_GRADIENT};padding:${PAD}px;font-family:${FONT};direction:rtl;position:absolute;left:-9999px;top:0;box-sizing:border-box;overflow:hidden;`;

  const wmHtml = logoBase64
    ? `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:360px;height:360px;background:url('${logoBase64}') center/contain no-repeat;opacity:0.03;pointer-events:none;"></div>`
    : '';

  outer.innerHTML = `
    <div style="position:absolute;top:-30px;right:-30px;width:260px;height:260px;background:radial-gradient(circle at top right,${BRAND}14,transparent 65%);pointer-events:none;"></div>
    <div style="position:absolute;bottom:-30px;left:-30px;width:260px;height:260px;background:radial-gradient(circle at bottom left,${BRAND_LIGHT}0a,transparent 65%);pointer-events:none;"></div>
    ${wmHtml}
  `;

  const inner = document.createElement('div');
  inner.style.cssText = `position:relative;color:#333;line-height:2;letter-spacing:0.3px;word-spacing:1px;${TF}font-family:${FONT};`;
  outer.appendChild(inner);

  return { outer, inner };
}

async function capture(page: HTMLDivElement): Promise<HTMLCanvasElement> {
  document.body.appendChild(page);
  await new Promise(r => setTimeout(r, 500));
  const canvas = await html2canvas(page, {
    scale: 2,
    useCORS: true,
    backgroundColor: null,
    logging: false,
    imageTimeout: 15000,
  });
  document.body.removeChild(page);
  return canvas;
}

function circle(text: string, size = 26): string {
  return `<span style="display:inline-flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:50%;border:2px solid ${BRAND};color:${BRAND};font-weight:700;font-size:${Math.floor(size * 0.42)}px;line-height:1;font-family:${FONT};box-sizing:border-box;${TF}">${text}</span>`;
}

function badge(text: string, size = 28): string {
  return `<span style="display:inline-flex;align-items:center;justify-content:center;min-width:${size}px;height:${size}px;border-radius:6px;background:linear-gradient(135deg,${BRAND},${BRAND_LIGHT});color:white;font-weight:700;font-size:${Math.floor(size * 0.42)}px;line-height:1;padding:0 6px;font-family:${FONT};${TF}">${text}</span>`;
}

export async function generateOrderPdf(orderId: string): Promise<void> {
  const fontLink = document.createElement('link');
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap';
  fontLink.rel = 'stylesheet';
  document.head.appendChild(fontLink);
  await document.fonts.ready;
  try {
    await Promise.all([
      document.fonts.load(`800 16px "Tajawal"`),
      document.fonts.load(`700 16px "Tajawal"`),
      document.fonts.load(`400 16px "Tajawal"`),
    ]);
  } catch { /* network font load is best-effort */ }
  await new Promise(r => setTimeout(r, 600));

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

  // Preload scarf images
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
  // PAGE 1: Big Logo + Order Info + Abaya Details
  // ══════════════════════════════════════
  {
    const { outer: p, inner: content } = makePage(logoBase64);
    let h = bigLogo(logoBase64);
    h += `<div style="text-align:right;">${sectionBanner('بيانات الطلب')}</div>`;
    let rows = '';
    const addIf = (l: string, v: any) => { if (v && v !== 0) rows += row(l, String(v)); };
    addIf('رقم الطلب', order.order_number);
    addIf('تاريخ الطلب', order.created_at ? new Date(order.created_at).toLocaleDateString('ar-SA') : '');
    addIf('مدة التنفيذ (أيام)', order.execution_duration);
    addIf('اسم القائدة', order.leader_name);
    addIf('اسم المدرسة', order.school_name);
    addIf('نوع الطلب', isKit ? 'طقم جاهز' : 'تفصيل');
    if (isKit && kit?.name) addIf('اسم الطقم', kit.name);
    if (sc) addIf('عدد الأطقم', sc);
    if (esc) addIf('الأوشحة الإضافية', esc);
    if (ehc) addIf('القبعات الإضافية', ehc);
    h += card(rows);

    if (sc > 0 && (abayaColor || sleeveStyle || sleeveColor)) {
      h += `<div style="margin-top:28px;text-align:right;">${sectionBanner('تفاصيل العباية')}</div>`;
      let ar = '';
      if (abayaColor) ar += row('لون العباية', abayaColor);
      if (order.abaya_length) ar += row('طول العباية', order.abaya_length);
      if (sleeveStyle?.name) ar += row('طرف الكم', sleeveStyle.name);
      if (sleeveColor) ar += row('لون طرف الكم', sleeveColor);
      h += card(ar);
    }
    content.innerHTML = h;
    pages.push(p);
  }

  // ══════════════════════════════════════
  // PAGE: Scarves
  // ══════════════════════════════════════
  if (scarfDesigns.length > 0) {
    const { outer: p, inner: content } = makePage(logoBase64);
    let h = hdr(logoBase64);
    h += `<div style="text-align:right;">${sectionBanner('تصاميم الأوشحة')}</div>`;

    if (scarfColor) {
      h += `<div style="text-align:center;margin-bottom:16px;font-size:13px;color:#6b5b8a;font-family:${FONT};line-height:2;${TF}">لون الوشاح: <strong style="color:#2d1b4e;">${scarfColor}</strong></div>`;
    }

    if (order.logo_embroidery_enabled || order.back_embroidery_enabled) {
      let svc = '';
      if (order.logo_embroidery_enabled && order.logo_embroidery_count) svc += row('تطريز الشعار', `${order.logo_embroidery_count}`);
      if (order.back_embroidery_enabled && order.back_embroidery_count) svc += row('التطريز الخلفي', `${order.back_embroidery_count}`);
      if (svc) {
        h += `<div style="max-width:420px;margin:0 auto 18px;background:#fff;border-radius:14px;padding:14px;border:1px solid #ede9f5;box-shadow:0 2px 10px rgba(68,3,118,0.04);">
          <p style="font-size:13px;font-weight:700;color:${BRAND};margin:0 0 8px;line-height:2;font-family:${FONT};${TF}">خدمات التطريز</p>${svc}</div>`;
      }
    }

    const count = scarfDesigns.length;
    const boxW = count >= 4 ? 340 : 360;
    const imgH = count >= 4 ? 120 : 160;

    h += `<div style="display:flex;flex-wrap:wrap;gap:14px;justify-content:center;">`;
    scarfDesigns.forEach((sd: any, i: number) => {
      const styleImg = scarfStyleImgs.get(sd.id);
      const dateImg = scarfDateImgs.get(sd.id);

      h += `<div style="width:${boxW}px;border:1px solid ${BRAND}14;border-radius:16px;overflow:hidden;background:#fff;box-shadow:0 4px 16px rgba(68,3,118,0.07),0 1px 3px rgba(68,3,118,0.04);">`;
      h += `<div style="padding:9px 14px;display:flex;align-items:center;gap:8px;background:linear-gradient(135deg,${BRAND}0a,${BRAND_LIGHT}06);border-bottom:1px solid ${BRAND}12;">
        ${badge(String(i + 1), 26)}
        <span style="font-weight:700;font-size:13px;color:${BRAND};font-family:${FONT};line-height:2;${TF}">وشاح ${i + 1}</span>
      </div>`;

      h += `<div style="display:flex;padding:12px;gap:10px;justify-content:center;background:#fefcff;">`;
      if (styleImg) {
        h += `<div style="flex:1;max-width:${Math.floor(boxW * 0.5)}px;height:${imgH}px;border-radius:10px;overflow:hidden;border:1px solid ${BRAND}12;display:flex;align-items:center;justify-content:center;background:#fff;box-shadow:0 2px 8px rgba(68,3,118,0.05);">
          <img src="${styleImg}" style="max-width:92%;max-height:92%;object-fit:contain;" />
        </div>`;
      }
      if (dateImg) {
        h += `<div style="width:${Math.floor(imgH * 0.6)}px;height:${imgH}px;border-radius:10px;overflow:hidden;border:1px solid ${BRAND}12;display:flex;align-items:center;justify-content:center;background:#fff;box-shadow:0 2px 8px rgba(68,3,118,0.05);">
          <img src="${dateImg}" style="max-width:88%;max-height:92%;object-fit:contain;" />
        </div>`;
      }
      h += `</div>`;

      h += `<div style="padding:6px 14px 12px;">`;
      const detail = (l: string, v: string) => {
        if (v) h += `<p style="font-size:10px;color:#6b5b8a;margin:3px 0;line-height:2;font-family:${FONT};${TF}">${l}: <strong style="color:#2d1b4e;">${v}</strong></p>`;
      };
      detail('التصميم', sd.scarf_styles?.name);
      detail('الطرف', sd.scarf_methods?.name);
      detail('اتجاه التطريز', sd.embroidery_directions?.name);
      detail('التاريخ', sd.date_types?.name);
      detail('الخط', sd.fonts?.name);
      detail('لون التطريز', sd.embroidery_color);
      h += `</div></div>`;
    });
    h += `</div>`;
    content.innerHTML = h;
    pages.push(p);
  }

  // ══════════════════════════════════════
  // PAGE: Hats
  // ══════════════════════════════════════
  const hasHats = students.some((s: any) => s.hat_embroidery_id) || extraHats.length > 0;
  if (hasHats) {
    const { outer: p, inner: content } = makePage(logoBase64);
    let h = hdr(logoBase64);
    h += `<div style="text-align:right;">${sectionBanner('تصاميم القبعات')}</div>`;

    if (hatColor) {
      h += `<div style="text-align:center;margin-bottom:14px;font-size:13px;color:#6b5b8a;font-family:${FONT};line-height:2;${TF}">لون القبعة: <strong style="color:#2d1b4e;">${hatColor}</strong></div>`;
    }

    if (order.hat_embroidery_enabled && order.hat_embroidery_count) {
      h += `<div style="max-width:420px;margin:0 auto 18px;background:#fff;border-radius:14px;padding:14px;border:1px solid #ede9f5;box-shadow:0 2px 10px rgba(68,3,118,0.04);">${row('عدد تطريز القبعات', `${order.hat_embroidery_count}`)}</div>`;
    }

    const groups: { name: string; img: string; count: number; fringes: string[] }[] = [];
    const groupMap = new Map<string, number>();

    for (const st of students) {
      if (!st.hat_embroidery_id) continue;
      const hn = st.hat_embroideries?.name || '';
      if (hn === 'بدون تطريز') continue;
      const img = hatImgs.get(st.hat_embroidery_id) || '';
      const idx = groupMap.get(hn);
      if (idx !== undefined) groups[idx].count++;
      else { groupMap.set(hn, groups.length); groups.push({ name: hn, img, count: 1, fringes: [] }); }
    }
    for (const eh of extraHats) {
      if (!eh.hat_embroidery_id) continue;
      const hn = eh.hat_embroideries?.name || '';
      if (hn === 'بدون تطريز') continue;
      const img = hatImgs.get(eh.hat_embroidery_id) || '';
      const fc = eh.fringe_color || '';
      const idx = groupMap.get(hn);
      if (idx !== undefined) { groups[idx].count++; if (fc && !groups[idx].fringes.includes(fc)) groups[idx].fringes.push(fc); }
      else { groupMap.set(hn, groups.length); groups.push({ name: hn, img, count: 1, fringes: fc ? [fc] : [] }); }
    }

    const boxW = groups.length > 3 ? 220 : 320;
    const imgSize = groups.length > 3 ? 80 : 100;

    h += `<div style="display:flex;flex-wrap:wrap;gap:14px;justify-content:center;">`;
    groups.forEach((g, i) => {
      h += `<div style="width:${boxW}px;border:1px solid ${BRAND}14;border-radius:16px;overflow:hidden;background:#fff;box-shadow:0 4px 16px rgba(68,3,118,0.07),0 1px 3px rgba(68,3,118,0.04);display:flex;">`;
      if (g.img) {
        h += `<div style="width:${imgSize + 20}px;min-height:${imgSize + 30}px;display:flex;align-items:center;justify-content:center;background:#faf8ff;border-left:1px solid ${BRAND}12;box-shadow:inset -2px 0 6px rgba(68,3,118,0.03);">
          <img src="${g.img}" style="max-width:${imgSize}px;max-height:${imgSize}px;object-fit:contain;" />
        </div>`;
      }
      h += `<div style="flex:1;padding:12px;line-height:2;">`;
      h += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        ${badge(String(i + 1), 24)}
        <span style="font-weight:700;font-size:12px;color:${BRAND};font-family:${FONT};${TF}">قبعة ${i + 1}</span>
      </div>`;
      h += `<p style="font-size:10px;color:#6b5b8a;margin:3px 0;font-family:${FONT};${TF}">الاسم: <strong style="color:#2d1b4e;">${g.name}</strong></p>`;
      h += `<p style="font-size:10px;color:#6b5b8a;margin:3px 0;font-family:${FONT};${TF}">الكمية: <strong style="color:#2d1b4e;">${g.count}</strong></p>`;
      if (g.fringes.length > 0) h += `<p style="font-size:10px;color:#6b5b8a;margin:3px 0;font-family:${FONT};${TF}">الهدب: <strong style="color:#2d1b4e;">${g.fringes.join('، ')}</strong></p>`;
      h += `</div></div>`;
    });
    h += `</div>`;
    content.innerHTML = h;
    pages.push(p);
  }

  // ══════════════════════════════════════
  // PAGES: Names Table
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

  const hatDesignOrder: string[] = [];
  const hatDesignMap = new Map<string, number>();
  for (const s of students) {
    if (!s.hat_embroidery_id) continue;
    const hn = s.hat_embroideries?.name || '';
    if (hn === 'بدون تطريز') continue;
    if (!hatDesignMap.has(hn)) { hatDesignOrder.push(hn); hatDesignMap.set(hn, hatDesignOrder.length); }
  }
  for (const eh of extraHats) {
    if (!eh.hat_embroidery_id) continue;
    const hn = eh.hat_embroideries?.name || '';
    if (hn === 'بدون تطريز') continue;
    if (!hatDesignMap.has(hn)) { hatDesignOrder.push(hn); hatDesignMap.set(hn, hatDesignOrder.length); }
  }

  interface NameRow {
    serial: string; name: string; size: string; scarfNum: string;
    hatDesignNum: string; hatDesignName: string; hatExtraText: string;
    backText: string; hasLogo: boolean;
  }
  const allRows: NameRow[] = [];

  for (const s of students) {
    const sn = s.scarf_design_id ? String(scarfCodeMap.get(s.scarf_design_id) || '') : '';
    const hn = s.hat_embroideries?.name || '';
    const isNone = hn === 'بدون تطريز' || !s.hat_embroidery_id;
    allRows.push({
      serial: String(s.serial_number), name: s.name || '', size: s.size || '',
      scarfNum: sn, hatDesignNum: isNone ? '' : String(hatDesignMap.get(hn) || ''),
      hatDesignName: isNone ? '' : hn, hatExtraText: s.hat_extra_text || '',
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
      allRows.push({
        serial: `ق${hatIdx}`, name: '', size: '',
        scarfNum: '', hatDesignNum: String(hatDesignMap.get(hn) || ''), hatDesignName: hn,
        hatExtraText: eh.hat_extra_text || '', backText: '', hasLogo: false,
      });
    }
  }

  if (allRows.length > 0) {
    const totalNamePages = Math.ceil(allRows.length / ROWS_PER_PAGE);
    for (let pi = 0; pi < totalNamePages; pi++) {
      const { outer: p, inner: content } = makePage(logoBase64);
      let h = hdr(logoBase64);
      h += `<div style="text-align:right;">${sectionBanner(totalNamePages > 1 ? `قائمة الأسماء (${pi + 1}/${totalNamePages})` : 'قائمة الأسماء')}</div>`;

      const thS = `padding:10px 8px;font-size:10px;font-weight:700;color:white;text-align:center;vertical-align:middle;line-height:2;font-family:${FONT};${TF}`;
      const tdS = (bg: string) => `padding:9px 6px;font-size:10px;text-align:center;vertical-align:middle;background:${bg};line-height:2;font-family:${FONT};border-bottom:1px solid #ede9f5;${TF}`;

      h += `<div style="overflow:hidden;border-radius:14px;border:1px solid ${BRAND}14;box-shadow:0 4px 20px rgba(68,3,118,0.06),0 1px 4px rgba(68,3,118,0.03);">`;
      h += `<table style="width:100%;border-collapse:collapse;">`;
      h += `<thead><tr style="background:linear-gradient(135deg,${BRAND},${BRAND_LIGHT});">`;
      h += `<th style="${thS}width:32px;">#</th><th style="${thS}">الاسم</th><th style="${thS}width:42px;">المقاس</th>`;
      h += `<th style="${thS}width:50px;">الوشاح</th>`;
      if (hasHatTextCol) h += `<th style="${thS}width:110px;">القبعة</th>`;
      if (hasBackCol) h += `<th style="${thS}width:95px;">تطريز خلفي</th>`;
      if (hasLogoCol) h += `<th style="${thS}width:40px;">شعار</th>`;
      h += `</tr></thead><tbody>`;

      const pageRows = allRows.slice(pi * ROWS_PER_PAGE, (pi + 1) * ROWS_PER_PAGE);
      pageRows.forEach((r, i) => {
        const bg = i % 2 === 0 ? '#fff' : '#f9f7ff';
        h += `<tr>`;
        h += `<td style="${tdS(bg)}font-weight:700;color:${BRAND};">${r.serial}</td>`;
        h += `<td style="${tdS(bg)}text-align:right;padding-right:12px;color:#2d1b4e;">${r.name}</td>`;
        h += `<td style="${tdS(bg)}">${r.size}</td>`;
        h += `<td style="${tdS(bg)}">${r.scarfNum ? circle(r.scarfNum, 24) : ''}</td>`;
        if (hasHatTextCol) {
          h += `<td style="${tdS(bg)}">`;
          if (r.hatDesignNum) {
            h += `<div style="display:flex;align-items:center;justify-content:center;gap:4px;">`;
            h += circle(r.hatDesignNum, 22);
            if (r.hatExtraText) h += `<span style="font-size:9px;color:#6b5b8a;font-family:${FONT};${TF}">(${r.hatExtraText})</span>`;
            h += `</div>`;
          }
          h += `</td>`;
        }
        if (hasBackCol) h += `<td style="${tdS(bg)}font-size:9px;color:#2d1b4e;">${r.backText}</td>`;
        if (hasLogoCol) h += `<td style="${tdS(bg)}">${r.hasLogo ? `<span style="color:#16a34a;font-size:14px;font-weight:700;">✓</span>` : ''}</td>`;
        h += `</tr>`;
      });
      h += `</tbody></table></div>`;
      content.innerHTML = h;
      pages.push(p);
    }
  }

  // ══════════════════════════════════════
  // PAGE: Shipping + Thank You
  // ══════════════════════════════════════
  const hasShipping = order.recipient_name || order.recipient_phone || shippingCityName;
  {
    const { outer: p, inner: content } = makePage(logoBase64);
    let h = hdr(logoBase64);

    if (hasShipping) {
      h += `<div style="text-align:right;">${sectionBanner('بيانات الشحن')}</div>`;
      let sr = '';
      if (order.recipient_name) sr += row('اسم المستلم', order.recipient_name);
      if (order.recipient_phone) sr += row('رقم الجوال', order.recipient_phone);
      if (shippingCityName) sr += row('المدينة', shippingCityName);
      if (order.district) sr += row('الحي', order.district);
      if (order.address_details) sr += row('تفاصيل العنوان', order.address_details);
      if (order.national_address) sr += row('العنوان الوطني', order.national_address);
      h += `<div style="max-width:450px;margin:0 auto;">${card(sr)}</div>`;
    }

    h += `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;margin-top:${hasShipping ? '60' : '200'}px;">
      <div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,${BRAND}18,${BRAND_LIGHT}22);display:flex;align-items:center;justify-content:center;margin-bottom:24px;border:2px solid ${BRAND}20;box-shadow:0 4px 16px rgba(68,3,118,0.10);">
        <span style="font-size:32px;">✨</span>
      </div>
      <h2 style="font-size:26px;font-weight:700;color:${BRAND};margin:0 0 12px;font-family:${FONT};${TF}">شكراً لكم</h2>
      <p style="font-size:14px;color:#8b7fa8;text-align:center;max-width:380px;line-height:2.4;margin:0;font-family:${FONT};${TF}">نشكركم على ثقتكم بمتجر Areba ونسعد بخدمتكم دائماً</p>
      <div style="margin-top:32px;width:80px;height:3px;background:linear-gradient(to right,${BRAND},${BRAND_LIGHT});border-radius:2px;"></div>
    </div>`;
    content.innerHTML = h;
    pages.push(p);
  }

  // ══════════════════════════════════════
  // CAPTURE & GENERATE PDF
  // ══════════════════════════════════════
  const doc = new jsPDF({ orientation: 'portrait', unit: 'px', format: [A4_W, A4_H] });

  for (let i = 0; i < pages.length; i++) {
    if (i > 0) doc.addPage([A4_W, A4_H]);
    const canvas = await capture(pages[i]);
    const imgData = canvas.toDataURL('image/jpeg', 0.94);
    doc.addImage(imgData, 'JPEG', 0, 0, A4_W, A4_H);
  }

  doc.save(`order-${order.order_number || orderId}.pdf`);
  document.head.removeChild(fontLink);
}
