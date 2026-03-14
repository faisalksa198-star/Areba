import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase } from '@/integrations/supabase/client';

const A4_W = 794;
const A4_H = 1123;
const PAD = 48;

// ── Brand Palette ──────────────────────────────────────────────
const BRAND        = '#3B0069';
const BRAND_MID    = '#6B21A8';
const BRAND_SOFT   = '#9333EA';
const ACCENT       = '#C084FC';
const INK          = '#1A0A2E';
const MUTED        = '#7C6A99';
const BORDER       = '#E8E0F5';
const SURFACE      = '#FFFFFF';
const ROW_ALT      = '#F9F6FF';
const BG_GRADIENT  = 'linear-gradient(160deg,#FDFCFF 0%,#F7F3FE 40%,#F2EDFD 70%,#FAF8FF 100%)';
const FONT         = `'Tajawal',sans-serif`;

// ── Helpers ────────────────────────────────────────────────────
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

function makePage(): HTMLDivElement {
  const d = document.createElement('div');
  d.style.cssText = [
    `width:${A4_W}px`,
    `min-height:${A4_H}px`,
    `background:${BG_GRADIENT}`,
    `padding:${PAD}px`,
    `font-family:${FONT}`,
    `direction:rtl`,
    `position:absolute`,
    `left:-9999px`,
    `top:0`,
    `box-sizing:border-box`,
    `color:${INK}`,
    `line-height:1.7`,
    `-webkit-font-smoothing:antialiased`,
  ].join(';');
  return d;
}

async function capture(page: HTMLDivElement): Promise<HTMLCanvasElement> {
  document.body.appendChild(page);
  await new Promise(r => setTimeout(r, 250));
  const canvas = await html2canvas(page, { scale: 2, useCORS: true, backgroundColor: null, logging: false });
  document.body.removeChild(page);
  return canvas;
}

// ── Layout Components ──────────────────────────────────────────

/** Full-width decorative header strip for page 1 */
function coverHeader(logo: string): string {
  return `
  <div style="
    position:relative;
    margin:-${PAD}px -${PAD}px 36px -${PAD}px;
    padding:36px ${PAD}px 28px;
    background:linear-gradient(135deg,${BRAND} 0%,${BRAND_MID} 55%,${BRAND_SOFT} 100%);
    display:flex; flex-direction:column; align-items:center; gap:14px;
    overflow:hidden;
  ">
    <!-- decorative circles -->
    <div style="position:absolute;top:-40px;left:-40px;width:160px;height:160px;border-radius:50%;background:rgba(255,255,255,0.05);"></div>
    <div style="position:absolute;bottom:-60px;right:-30px;width:220px;height:220px;border-radius:50%;background:rgba(255,255,255,0.04);"></div>

    <img src="${logo}" style="height:48px;filter:brightness(0) invert(1);position:relative;z-index:1;" />
    <div style="width:48px;height:2px;background:rgba(255,255,255,0.4);border-radius:2px;"></div>
    <p style="
      font-family:${FONT};font-size:13px;font-weight:500;
      color:rgba(255,255,255,0.75);margin:0;letter-spacing:0.5px;
      position:relative;z-index:1;
    ">ملخص الطلب</p>
  </div>`;
}

/** Compact logo for inner pages */
function pageHeader(logo: string): string {
  return `
  <div style="
    display:flex; justify-content:space-between; align-items:center;
    margin-bottom:28px; padding-bottom:14px;
    border-bottom:2px solid ${BORDER};
  ">
    <div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,${BRAND},${BRAND_SOFT});opacity:0.15;"></div>
    <img src="${logo}" style="height:30px;" />
  </div>`;
}

/** Section title with left accent bar (RTL: appears on the right) */
function sectionTitle(text: string): string {
  return `
  <div style="display:flex;align-items:center;gap:10px;margin:0 0 18px;justify-content:flex-end;">
    <span style="
      font-family:${FONT};font-size:15px;font-weight:800;
      color:${BRAND};letter-spacing:0.2px;
    ">${text}</span>
    <div style="width:4px;height:22px;border-radius:2px;background:linear-gradient(to bottom,${BRAND},${BRAND_SOFT});flex-shrink:0;"></div>
  </div>`;
}

/** Key-value row inside a card */
function row(label: string, value: string): string {
  return `
  <div style="
    display:flex; justify-content:space-between; align-items:center;
    padding:9px 14px; border-bottom:1px solid ${BORDER};
    gap:12px;
  ">
    <span style="font-family:${FONT};font-size:11px;color:${MUTED};white-space:nowrap;">${label}</span>
    <span style="font-family:${FONT};font-weight:700;font-size:11px;color:${INK};text-align:right;">${value}</span>
  </div>`;
}

/** White surface card */
function card(content: string, maxWidth = 480): string {
  return `
  <div style="
    max-width:${maxWidth}px; margin:0 auto;
    background:${SURFACE}; border-radius:16px;
    border:1px solid ${BORDER};
    box-shadow:0 4px 24px rgba(59,0,105,0.06),0 1px 4px rgba(59,0,105,0.04);
    overflow:hidden;
  ">${content}</div>`;
}

/** Numbered circle (outline style) */
function circle(text: string, size = 26): string {
  const fs = Math.floor(size * 0.44);
  return `<span style="
    display:inline-flex; align-items:center; justify-content:center;
    width:${size}px; height:${size}px; border-radius:50%;
    border:2px solid ${BRAND}; color:${BRAND};
    font-weight:800; font-size:${fs}px;
    font-family:${FONT}; box-sizing:border-box; flex-shrink:0;
    background:${BRAND}0D;
  ">${text}</span>`;
}

/** Numbered badge (filled) */
function badge(text: string, size = 28): string {
  const fs = Math.floor(size * 0.44);
  return `<span style="
    display:inline-flex; align-items:center; justify-content:center;
    min-width:${size}px; height:${size}px; border-radius:8px;
    background:linear-gradient(135deg,${BRAND},${BRAND_MID});
    color:#fff; font-weight:800; font-size:${fs}px;
    padding:0 7px; font-family:${FONT}; flex-shrink:0;
  ">${text}</span>`;
}

/** Small info pill */
function pill(label: string, value: string): string {
  return `
  <div style="
    display:inline-flex; flex-direction:column; align-items:center;
    background:${SURFACE}; border:1px solid ${BORDER}; border-radius:12px;
    padding:10px 18px; gap:3px;
    box-shadow:0 2px 8px rgba(59,0,105,0.05);
  ">
    <span style="font-family:${FONT};font-size:9px;color:${MUTED};font-weight:500;">${label}</span>
    <span style="font-family:${FONT};font-size:13px;color:${BRAND};font-weight:800;">${value}</span>
  </div>`;
}

// ── Main Export ────────────────────────────────────────────────
export async function generateOrderPdf(orderId: string): Promise<void> {

  // Font injection
  const fontLink = document.createElement('link');
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap';
  fontLink.rel  = 'stylesheet';
  document.head.appendChild(fontLink);
  await document.fonts.ready;
  await new Promise(r => setTimeout(r, 450));

  // ── Data fetching (unchanged) ──────────────────────────────
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

  const students      = (studentsRes.data    || []) as any[];
  const scarfDesigns  = (scarfDesignsRes.data || []) as any[];
  const extraScarves  = (extraScarvesRes.data || []) as any[];
  const extraHats     = (extraHatsRes.data   || []) as any[];

  const isKit      = order.order_type === 'ready_kit';
  const kit        = isKit ? order.ready_kits : null;
  const abayaColor = isKit ? kit?.abaya_color  : order.custom_abaya_color;
  const scarfColor = isKit ? kit?.scarf_color  : order.custom_scarf_color;
  const hatColor   = isKit ? kit?.hat_color    : order.custom_hat_color;
  const sleeveColor= isKit ? (kit?.sleeve_color || '') : (order.sleeve_color || '');
  const sleeveStyle= isKit ? kit?.sleeve_styles : order.sleeve_styles;

  let shippingCityName = '';
  if (order.shipping_city_id) {
    const { data: cityData } = await supabase.from('cities').select('name').eq('id', order.shipping_city_id).single();
    shippingCityName = cityData?.name || '';
  }

  const logoBase64 = await toBase64(window.location.origin + '/logo.svg');

  // Preload images
  const scarfStyleImgs = new Map<string, string>();
  const scarfDateImgs  = new Map<string, string>();
  for (const sd of scarfDesigns) {
    if (sd.scarf_styles?.image_url) scarfStyleImgs.set(sd.id, await toBase64(sd.scarf_styles.image_url));
    if (sd.date_types?.image_url)   scarfDateImgs.set(sd.id,  await toBase64(sd.date_types.image_url));
  }

  const hatImgs = new Map<string, string>();
  const hatIds  = new Set<string>();
  students.forEach((s: any)  => s.hat_embroidery_id && hatIds.add(s.hat_embroidery_id));
  extraHats.forEach((h: any) => h.hat_embroidery_id && hatIds.add(h.hat_embroidery_id));
  for (const id of hatIds) {
    const { data } = await supabase.from('hat_embroideries').select('image_url').eq('id', id).single();
    if (data?.image_url) hatImgs.set(id, await toBase64(data.image_url));
  }

  const sc  = order.student_count      || 0;
  const esc = order.extra_scarf_count  || 0;
  const ehc = order.extra_hat_count    || 0;
  const pages: HTMLDivElement[] = [];

  // ══════════════════════════════════════════════════════════════
  // PAGE 1 — Cover header + Order info + Abaya details
  // ══════════════════════════════════════════════════════════════
  {
    const p = makePage();
    let h = coverHeader(logoBase64);

    // Quick-stats pills row
    const pills: string[] = [];
    if (sc)  pills.push(pill('عدد الأطقم', String(sc)));
    if (esc) pills.push(pill('أوشحة إضافية', String(esc)));
    if (ehc) pills.push(pill('قبعات إضافية', String(ehc)));
    if (pills.length) {
      h += `<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-bottom:28px;">${pills.join('')}</div>`;
    }

    // Order info card
    h += sectionTitle('بيانات الطلب');
    let rows = '';
    const addIf = (l: string, v: any) => { if (v && v !== 0) rows += row(l, String(v)); };
    addIf('رقم الطلب',         order.order_number);
    addIf('تاريخ الطلب',       order.created_at ? new Date(order.created_at).toLocaleDateString('ar-SA') : '');
    addIf('مدة التنفيذ (أيام)',order.execution_duration);
    addIf('اسم القائدة',       order.leader_name);
    addIf('اسم المدرسة',       order.school_name);
    addIf('نوع الطلب',         isKit ? 'طقم جاهز' : 'تفصيل');
    if (isKit && kit?.name)    rows += row('اسم الطقم', kit.name);
    h += card(rows);

    // Abaya details
    if (sc > 0 && (abayaColor || sleeveStyle || sleeveColor)) {
      h += `<div style="margin-top:32px;">`;
      h += sectionTitle('تفاصيل العباية');
      let ar = '';
      if (abayaColor)        ar += row('لون العباية',     abayaColor);
      if (order.abaya_length)ar += row('طول العباية',     order.abaya_length);
      if (sleeveStyle?.name) ar += row('طرف الكم',        sleeveStyle.name);
      if (sleeveColor)       ar += row('لون طرف الكم',    sleeveColor);
      h += card(ar);
      h += `</div>`;
    }

    p.innerHTML = h;
    pages.push(p);
  }

  // ══════════════════════════════════════════════════════════════
  // PAGE — Scarf designs
  // ══════════════════════════════════════════════════════════════
  if (scarfDesigns.length > 0) {
    const p = makePage();
    let h = pageHeader(logoBase64);
    h += sectionTitle('تصاميم الأوشحة');

    if (scarfColor) {
      h += `<div style="
        display:flex;align-items:center;justify-content:flex-end;gap:10px;
        margin-bottom:20px;padding:10px 16px;
        background:${SURFACE};border-radius:10px;border:1px solid ${BORDER};
        max-width:300px;margin-right:0;
      ">
        <span style="font-family:${FONT};font-size:11px;color:${MUTED};">لون الوشاح</span>
        <span style="font-family:${FONT};font-size:12px;font-weight:800;color:${INK};">${scarfColor}</span>
      </div>`;
    }

    // Embroidery services
    if (order.logo_embroidery_enabled || order.back_embroidery_enabled) {
      let svc = '';
      if (order.logo_embroidery_enabled && order.logo_embroidery_count)
        svc += row('تطريز الشعار', String(order.logo_embroidery_count));
      if (order.back_embroidery_enabled && order.back_embroidery_count)
        svc += row('التطريز الخلفي', String(order.back_embroidery_count));
      if (svc) {
        h += `<div style="max-width:360px;margin:0 0 20px;">
          <div style="background:${SURFACE};border-radius:12px;border:1px solid ${BORDER};overflow:hidden;
            box-shadow:0 2px 8px rgba(59,0,105,0.04);">
            <div style="padding:10px 14px;background:linear-gradient(to left,${BRAND}08,transparent);
              border-bottom:1px solid ${BORDER};">
              <span style="font-family:${FONT};font-size:11px;font-weight:700;color:${BRAND};">خدمات التطريز</span>
            </div>
            ${svc}
          </div>
        </div>`;
      }
    }

    const count = scarfDesigns.length;
    const boxW  = count >= 4 ? 330 : 350;
    const imgH  = count >= 4 ? 110 : 150;

    h += `<div style="display:flex;flex-wrap:wrap;gap:14px;justify-content:center;">`;

    scarfDesigns.forEach((sd: any, i: number) => {
      const styleImg = scarfStyleImgs.get(sd.id);
      const dateImg  = scarfDateImgs.get(sd.id);

      h += `<div style="
        width:${boxW}px;
        background:${SURFACE};border-radius:16px;
        border:1px solid ${BORDER};
        box-shadow:0 4px 20px rgba(59,0,105,0.06);
        overflow:hidden;
      ">`;

      // Card header strip
      h += `<div style="
        padding:10px 14px;
        display:flex;align-items:center;gap:8px;
        background:linear-gradient(to left,${BRAND}0A,transparent);
        border-bottom:1px solid ${BORDER};
      ">
        ${badge(String(i + 1), 24)}
        <span style="font-family:${FONT};font-weight:800;font-size:12px;color:${BRAND};">وشاح ${i + 1}</span>
      </div>`;

      // Images
      h += `<div style="display:flex;padding:12px;gap:10px;justify-content:center;background:${ROW_ALT};">`;
      if (styleImg) {
        h += `<div style="
          flex:1;max-width:${Math.floor(boxW * 0.52)}px;height:${imgH}px;
          border-radius:10px;overflow:hidden;border:1px solid ${BORDER};
          display:flex;align-items:center;justify-content:center;background:${SURFACE};
        ">
          <img src="${styleImg}" style="max-width:92%;max-height:92%;object-fit:contain;" />
        </div>`;
      }
      if (dateImg) {
        h += `<div style="
          width:${Math.floor(imgH * 0.62)}px;height:${imgH}px;
          border-radius:10px;overflow:hidden;border:1px solid ${BORDER};
          display:flex;align-items:center;justify-content:center;background:${SURFACE};
        ">
          <img src="${dateImg}" style="max-width:88%;max-height:92%;object-fit:contain;" />
        </div>`;
      }
      h += `</div>`;

      // Detail rows
      h += `<div style="padding:6px 0 8px;">`;
      const detail = (l: string, v: string) => {
        if (!v) return;
        h += `<div style="
          display:flex;justify-content:space-between;align-items:center;
          padding:5px 14px;border-bottom:1px solid ${BORDER}08;
        ">
          <span style="font-family:${FONT};font-size:10px;color:${MUTED};">${l}</span>
          <span style="font-family:${FONT};font-size:10px;font-weight:700;color:${INK};">${v}</span>
        </div>`;
      };
      detail('التصميم',         sd.scarf_styles?.name   || '');
      detail('الطرف',           sd.scarf_methods?.name  || '');
      detail('اتجاه التطريز',   sd.embroidery_directions?.name || '');
      detail('التاريخ',         sd.date_types?.name     || '');
      detail('الخط',            sd.fonts?.name          || '');
      detail('لون التطريز',     sd.embroidery_color     || '');
      h += `</div>`;

      h += `</div>`;
    });

    h += `</div>`;
    p.innerHTML = h;
    pages.push(p);
  }

  // ══════════════════════════════════════════════════════════════
  // PAGE — Hat designs
  // ══════════════════════════════════════════════════════════════
  const hasHats = students.some((s: any) => s.hat_embroidery_id) || extraHats.length > 0;
  if (hasHats) {
    const p = makePage();
    let h = pageHeader(logoBase64);
    h += sectionTitle('تصاميم القبعات');

    if (hatColor) {
      h += `<div style="
        display:flex;align-items:center;justify-content:flex-end;gap:10px;
        margin-bottom:20px;padding:10px 16px;
        background:${SURFACE};border-radius:10px;border:1px solid ${BORDER};
        max-width:300px;margin-right:0;
      ">
        <span style="font-family:${FONT};font-size:11px;color:${MUTED};">لون القبعة</span>
        <span style="font-family:${FONT};font-size:12px;font-weight:800;color:${INK};">${hatColor}</span>
      </div>`;
    }

    if (order.hat_embroidery_enabled && order.hat_embroidery_count) {
      h += `<div style="max-width:320px;margin:0 0 18px;">
        ${card(row('عدد تطريز القبعات', String(order.hat_embroidery_count)), 320)}
      </div>`;
    }

    // Group hats
    const groups: { name: string; img: string; count: number; fringes: string[] }[] = [];
    const groupMap = new Map<string, number>();

    for (const st of students) {
      if (!st.hat_embroidery_id) continue;
      const hn  = st.hat_embroideries?.name || '';
      if (hn === 'بدون تطريز') continue;
      const img = hatImgs.get(st.hat_embroidery_id) || '';
      const idx = groupMap.get(hn);
      if (idx !== undefined) groups[idx].count++;
      else { groupMap.set(hn, groups.length); groups.push({ name: hn, img, count: 1, fringes: [] }); }
    }
    for (const eh of extraHats) {
      if (!eh.hat_embroidery_id) continue;
      const hn  = eh.hat_embroideries?.name || '';
      if (hn === 'بدون تطريز') continue;
      const img = hatImgs.get(eh.hat_embroidery_id) || '';
      const fc  = eh.fringe_color || '';
      const idx = groupMap.get(hn);
      if (idx !== undefined) {
        groups[idx].count++;
        if (fc && !groups[idx].fringes.includes(fc)) groups[idx].fringes.push(fc);
      } else {
        groupMap.set(hn, groups.length);
        groups.push({ name: hn, img, count: 1, fringes: fc ? [fc] : [] });
      }
    }

    const boxW   = groups.length > 3 ? 215 : 315;
    const imgSize= groups.length > 3 ? 76  : 96;

    h += `<div style="display:flex;flex-wrap:wrap;gap:14px;justify-content:center;">`;

    groups.forEach((g, i) => {
      h += `<div style="
        width:${boxW}px;
        background:${SURFACE};border-radius:16px;
        border:1px solid ${BORDER};
        box-shadow:0 4px 20px rgba(59,0,105,0.06);
        overflow:hidden;display:flex;
      ">`;

      if (g.img) {
        h += `<div style="
          width:${imgSize + 24}px;min-height:${imgSize + 32}px;
          display:flex;align-items:center;justify-content:center;
          background:${ROW_ALT};border-left:1px solid ${BORDER};
          flex-shrink:0;
        ">
          <img src="${g.img}" style="max-width:${imgSize}px;max-height:${imgSize}px;object-fit:contain;" />
        </div>`;
      }

      h += `<div style="flex:1;padding:14px 12px;">`;
      h += `<div style="display:flex;align-items:center;gap:7px;margin-bottom:10px;">
        ${badge(String(i + 1), 22)}
        <span style="font-family:${FONT};font-weight:800;font-size:11px;color:${BRAND};">قبعة ${i + 1}</span>
      </div>`;

      const det = (l: string, v: string) => `
        <p style="font-family:${FONT};font-size:10px;color:${MUTED};margin:4px 0;">
          ${l}: <strong style="color:${INK};font-weight:700;">${v}</strong>
        </p>`;
      h += det('الاسم', g.name);
      h += det('الكمية', String(g.count));
      if (g.fringes.length) h += det('الهدب', g.fringes.join('، '));
      h += `</div></div>`;
    });

    h += `</div>`;
    p.innerHTML = h;
    pages.push(p);
  }

  // ══════════════════════════════════════════════════════════════
  // PAGES — Names table
  // ══════════════════════════════════════════════════════════════
  const ROWS_PER_PAGE = 18;
  const scarfCodeMap  = new Map<string, number>();
  scarfDesigns.forEach((sd: any, i: number) => scarfCodeMap.set(sd.id, i + 1));

  const hasBackCol    = students.some(s => s.back_embroidery_text?.trim())   || extraScarves.some(s => s.back_embroidery_text?.trim());
  const hasLogoCol    = students.some(s => s.has_logo_embroidery)            || extraScarves.some(s => s.has_logo_embroidery);
  const hasHatTextCol = students.some(s => {
    const hn = s.hat_embroideries?.name || '';
    return hn !== 'بدون تطريز' && s.hat_embroidery_id;
  }) || extraHats.some(h => h.hat_embroidery_id && h.hat_embroideries?.name !== 'بدون تطريز');

  const hatDesignOrder: string[] = [];
  const hatDesignMap  = new Map<string, number>();
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
    const sn   = s.scarf_design_id ? String(scarfCodeMap.get(s.scarf_design_id) || '') : '';
    const hn   = s.hat_embroideries?.name || '';
    const none = hn === 'بدون تطريز' || !s.hat_embroidery_id;
    allRows.push({
      serial: String(s.serial_number), name: s.name || '', size: s.size || '',
      scarfNum: sn,
      hatDesignNum:  none ? '' : String(hatDesignMap.get(hn) || ''),
      hatDesignName: none ? '' : hn,
      hatExtraText: s.hat_extra_text || '',
      backText: s.back_embroidery_text || '',
      hasLogo: s.has_logo_embroidery || false,
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
      const p = makePage();
      let h   = pageHeader(logoBase64);
      const title = totalNamePages > 1
        ? `قائمة الأسماء (${pi + 1} / ${totalNamePages})`
        : 'قائمة الأسماء';
      h += sectionTitle(title);

      // Table styles
      const TH = `
        padding:11px 8px;
        font-family:${FONT};font-size:10px;font-weight:700;
        color:#fff;text-align:center;vertical-align:middle;
        letter-spacing:0.2px;
      `;
      const TD = (bg: string) => `
        padding:9px 7px;
        font-family:${FONT};font-size:10px;
        text-align:center;vertical-align:middle;
        background:${bg};border-bottom:1px solid ${BORDER};
      `;

      h += `<div style="
        overflow:hidden;border-radius:14px;
        border:1px solid ${BORDER};
        box-shadow:0 4px 24px rgba(59,0,105,0.07);
      ">`;
      h += `<table style="width:100%;border-collapse:collapse;">`;
      h += `<thead>
        <tr style="background:linear-gradient(to left,${BRAND},${BRAND_MID});">
          <th style="${TH}width:34px;">#</th>
          <th style="${TH}">الاسم</th>
          <th style="${TH}width:44px;">المقاس</th>
          <th style="${TH}width:52px;">الوشاح</th>
          ${hasHatTextCol ? `<th style="${TH}width:108px;">القبعة</th>` : ''}
          ${hasBackCol    ? `<th style="${TH}width:92px;">تطريز خلفي</th>` : ''}
          ${hasLogoCol    ? `<th style="${TH}width:40px;">شعار</th>` : ''}
        </tr>
      </thead>`;
      h += `<tbody>`;

      const pageRows = allRows.slice(pi * ROWS_PER_PAGE, (pi + 1) * ROWS_PER_PAGE);
      pageRows.forEach((r, i) => {
        const bg = i % 2 === 0 ? SURFACE : ROW_ALT;
        h += `<tr>`;
        h += `<td style="${TD(bg)}font-weight:800;color:${BRAND};">${r.serial}</td>`;
        h += `<td style="${TD(bg)}text-align:right;padding-right:14px;color:${INK};font-weight:500;">${r.name}</td>`;
        h += `<td style="${TD(bg)}color:${MUTED};">${r.size}</td>`;
        h += `<td style="${TD(bg)}">${r.scarfNum ? circle(r.scarfNum, 24) : ''}</td>`;
        if (hasHatTextCol) {
          h += `<td style="${TD(bg)}">`;
          if (r.hatDesignNum) {
            h += `<div style="display:flex;align-items:center;justify-content:center;gap:5px;">
              ${circle(r.hatDesignNum, 22)}
              ${r.hatExtraText
                ? `<span style="font-family:${FONT};font-size:9px;color:${MUTED};">(${r.hatExtraText})</span>`
                : ''}
            </div>`;
          }
          h += `</td>`;
        }
        if (hasBackCol) h += `<td style="${TD(bg)}font-size:9px;color:${INK};">${r.backText}</td>`;
        if (hasLogoCol) h += `<td style="${TD(bg)}">
          ${r.hasLogo ? `<span style="color:#16a34a;font-size:15px;font-weight:800;">✓</span>` : ''}
        </td>`;
        h += `</tr>`;
      });

      h += `</tbody></table></div>`;
      p.innerHTML = h;
      pages.push(p);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // LAST PAGE — Shipping + Thank you
  // ══════════════════════════════════════════════════════════════
  {
    const p = makePage();
    let h = pageHeader(logoBase64);
    const hasShipping = order.recipient_name || order.recipient_phone || shippingCityName;

    if (hasShipping) {
      h += sectionTitle('بيانات الشحن');
      let sr = '';
      if (order.recipient_name)   sr += row('اسم المستلم',     order.recipient_name);
      if (order.recipient_phone)  sr += row('رقم الجوال',      order.recipient_phone);
      if (shippingCityName)       sr += row('المدينة',          shippingCityName);
      if (order.district)         sr += row('الحي',             order.district);
      if (order.address_details)  sr += row('تفاصيل العنوان',  order.address_details);
      if (order.national_address) sr += row('العنوان الوطني',  order.national_address);
      h += `<div style="max-width:460px;margin:0 auto 0 0;">${card(sr, 460)}</div>`;
    }

    // Thank-you section
    const topMargin = hasShipping ? 60 : 180;
    h += `
    <div style="
      display:flex;flex-direction:column;align-items:center;
      justify-content:center;margin-top:${topMargin}px;
    ">
      <!-- decorative ring -->
      <div style="
        width:80px;height:80px;border-radius:50%;
        background:linear-gradient(135deg,${BRAND}12,${BRAND_SOFT}18);
        display:flex;align-items:center;justify-content:center;
        margin-bottom:22px;
        border:2px solid ${BRAND}22;
        box-shadow:0 0 0 8px ${BRAND}06;
      ">
        <span style="font-size:34px;">✨</span>
      </div>

      <h2 style="
        font-family:${FONT};font-size:28px;font-weight:800;
        color:${BRAND};margin:0 0 10px;letter-spacing:0.3px;
      ">شكراً لكم</h2>

      <p style="
        font-family:${FONT};font-size:13px;color:${MUTED};
        text-align:center;max-width:340px;
        line-height:2;margin:0;
      ">نشكركم على ثقتكم بمتجر Areba<br>ونسعد بخدمتكم دائماً</p>

      <div style="
        margin-top:28px;
        width:80px;height:3px;border-radius:2px;
        background:linear-gradient(to right,${BRAND},${BRAND_SOFT});
      "></div>
    </div>`;

    p.innerHTML = h;
    pages.push(p);
  }

  // ══════════════════════════════════════════════════════════════
  // Capture & assemble PDF
  // ══════════════════════════════════════════════════════════════
  const doc = new jsPDF({ orientation: 'portrait', unit: 'px', format: [A4_W, A4_H] });

  for (let i = 0; i < pages.length; i++) {
    if (i > 0) doc.addPage([A4_W, A4_H]);
    const canvas  = await capture(pages[i]);
    const imgData = canvas.toDataURL('image/jpeg', 0.93);
    doc.addImage(imgData, 'JPEG', 0, 0, A4_W, A4_H);
  }

  doc.save(`order-${order.order_number || orderId}.pdf`);
  document.head.removeChild(fontLink);
}
