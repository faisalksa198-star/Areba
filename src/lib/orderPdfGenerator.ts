import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase } from '@/integrations/supabase/client';

const A4_W    = 794;
const A4_H    = 1123;
const HDR_H   = 66;   // header strip height
const FTR_H   = 26;   // footer strip height
const PAD_X   = 44;
const PAD_Y   = 20;
const BRAND       = '#440376';
const BRAND_LIGHT = '#6B21A8';
const FONT = `'Tajawal', sans-serif`;

/* Applied to every text node to fix Arabic shaping in canvas */
const TF = [
  'text-rendering:optimizeLegibility',
  '-webkit-font-smoothing:antialiased',
  'unicode-bidi:isolate',
  'font-feature-settings:"kern" 1,"liga" 1,"calt" 1',
].join(';') + ';';

/* ─── Utilities ─────────────────────────────────────────── */

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

/**
 * Fetches the Google Fonts CSS for Tajawal and replaces every font URL
 * with an inline base64 data-URI so html2canvas can read it from
 * its cloned document without any CORS or network dependency.
 */
async function loadFontCss(): Promise<string> {
  try {
    const cssRes = await fetch(
      'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;800&display=swap',
      { cache: 'force-cache' }
    );
    const css = await cssRes.text();

    /* collect all unique woff2 URLs found in the CSS */
    const fontUrls = [
      ...css.matchAll(/url\((https:\/\/[^)]+)\)/g),
    ].map(m => m[1]).filter((v, i, a) => a.indexOf(v) === i);

    let processed = css;
    await Promise.all(fontUrls.map(async (u) => {
      const b64 = await toBase64(u);
      if (b64) processed = processed.split(`url(${u})`).join(`url(${b64})`);
    }));
    return processed;
  } catch { return ''; }
}

/* ─── HTML helpers ──────────────────────────────────────── */

function sectionBanner(text: string): string {
  return `<div style="display:inline-flex;align-items:center;margin:0 0 18px;padding:8px 16px 8px 20px;`
       + `background:linear-gradient(135deg,${BRAND}10,${BRAND_LIGHT}08);border-radius:10px;`
       + `border-right:4px solid ${BRAND};">`
       + `<span style="font-size:15px;font-weight:800;color:${BRAND};letter-spacing:0.4px;`
       + `font-family:${FONT};line-height:1.6;white-space:nowrap;${TF}">${text}</span>`
       + `</div>`;
}

function row(label: string, value: string): string {
  return `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:1px solid #e8e4f0;line-height:1.8;">`
       + `<span style="color:#7c6fa0;font-size:12px;font-family:${FONT};white-space:nowrap;${TF}">${label}</span>`
       + `<span style="font-weight:700;font-size:12px;color:#1a1a2e;font-family:${FONT};text-align:right;${TF}">${value}</span>`
       + `</div>`;
}

function card(content: string): string {
  return `<div style="max-width:480px;margin:0 auto;background:#f8f7fc;border-radius:14px;`
       + `padding:16px;border:1px solid ${BRAND}18;`
       + `box-shadow:0 3px 14px rgba(68,3,118,0.06);overflow:hidden;">${content}</div>`;
}

function circle(text: string, size = 26): string {
  return `<span style="display:inline-flex;align-items:center;justify-content:center;`
       + `width:${size}px;height:${size}px;border-radius:50%;border:2px solid ${BRAND};`
       + `color:${BRAND};font-weight:700;font-size:${Math.floor(size * 0.42)}px;line-height:1;`
       + `font-family:${FONT};box-sizing:border-box;${TF}">${text}</span>`;
}

function badge(text: string, size = 28): string {
  return `<span style="display:inline-flex;align-items:center;justify-content:center;`
       + `min-width:${size}px;height:${size}px;border-radius:6px;`
       + `background:linear-gradient(135deg,${BRAND},${BRAND_LIGHT});color:white;`
       + `font-weight:700;font-size:${Math.floor(size * 0.42)}px;line-height:1;`
       + `padding:0 6px;font-family:${FONT};${TF}">${text}</span>`;
}

/* ─── Page factory ──────────────────────────────────────── */

/**
 * Creates a page div with:
 *  - Pure white (#fff) body  → clean for print
 *  - Full-width gradient header strip with logo on the visual left
 *  - Full-width gradient footer strip at the bottom (absolute)
 *  - An `inner` content div the caller fills via innerHTML
 */
function makePage(logoBase64 = ''): { outer: HTMLDivElement; inner: HTMLDivElement } {
  const outer = document.createElement('div');
  outer.style.cssText =
    `width:${A4_W}px;min-height:${A4_H}px;background:#ffffff;` +
    `font-family:${FONT};direction:rtl;` +
    `position:absolute;left:-9999px;top:0;` +
    `box-sizing:border-box;overflow:hidden;`;

  /* Header – direction:ltr so logo lands on the visual left */
  const header = document.createElement('div');
  header.style.cssText =
    `width:100%;height:${HDR_H}px;` +
    `background:linear-gradient(135deg,${BRAND} 0%,${BRAND_LIGHT} 100%);` +
    `display:flex;align-items:center;justify-content:space-between;` +
    `padding:0 ${PAD_X}px;box-sizing:border-box;direction:ltr;`;
  header.innerHTML = logoBase64
    ? `<img src="${logoBase64}" style="height:34px;" />`
    + `<span style="color:rgba(255,255,255,0.55);font-size:10px;font-family:${FONT};${TF}direction:rtl;">تقرير طلب · Areba</span>`
    : `<span style="color:white;font-size:15px;font-weight:800;font-family:${FONT};">Areba</span>`
    + `<span style="color:rgba(255,255,255,0.55);font-size:10px;font-family:${FONT};${TF}">تقرير طلب</span>`;
  outer.appendChild(header);

  /* Content */
  const inner = document.createElement('div');
  inner.style.cssText =
    `padding:${PAD_Y}px ${PAD_X}px ${FTR_H + PAD_Y + 8}px;` +
    `direction:rtl;unicode-bidi:isolate;` +
    `color:#1a1a2e;line-height:2;letter-spacing:0.3px;word-spacing:1px;` +
    `${TF}font-family:${FONT};` +
    `max-height:${A4_H - HDR_H - FTR_H}px;overflow:hidden;`;
  outer.appendChild(inner);

  /* Footer */
  const footer = document.createElement('div');
  footer.style.cssText =
    `position:absolute;bottom:0;left:0;width:${A4_W}px;height:${FTR_H}px;` +
    `background:linear-gradient(135deg,${BRAND} 0%,${BRAND_LIGHT} 100%);` +
    `display:flex;align-items:center;justify-content:center;`;
  footer.innerHTML =
    `<span style="color:rgba(255,255,255,0.45);font-size:9px;` +
    `font-family:${FONT};letter-spacing:2px;${TF}">AREBA</span>`;
  outer.appendChild(footer);

  return { outer, inner };
}

/* ─── Canvas capture ────────────────────────────────────── */

/**
 * Injects the pre-loaded base64 font CSS into html2canvas's cloned document
 * so Arabic glyphs render with Tajawal — not the browser fallback font.
 */
async function capture(page: HTMLDivElement, fontCss: string): Promise<HTMLCanvasElement> {
  document.body.appendChild(page);
  /* allow the browser to lay out and apply fonts before capturing */
  void page.getBoundingClientRect();
  await new Promise(r => setTimeout(r, 700));

  const canvas = await html2canvas(page, {
    scale: 3,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    imageTimeout: 15000,
    windowWidth: A4_W + 20,
    windowHeight: A4_H + 20,
    onclone: (clonedDoc: Document) => {
      if (fontCss) {
        const s = clonedDoc.createElement('style');
        s.textContent = fontCss;
        /* insert before everything else so it has highest priority */
        clonedDoc.head.insertBefore(s, clonedDoc.head.firstChild);
      }
    },
  });

  document.body.removeChild(page);
  return canvas;
}

/* ─── Main export ───────────────────────────────────────── */

export async function generateOrderPdf(orderId: string): Promise<void> {

  /* Start fetching the embedded font CSS in parallel with Supabase queries */
  const fontCssPromise = loadFontCss();

  /* Inject Google Fonts link for the live document (fallback) */
  const fontLink = document.createElement('link');
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;800&display=swap';
  fontLink.rel = 'stylesheet';
  document.head.appendChild(fontLink);
  await document.fonts.ready;
  try {
    await Promise.all([
      document.fonts.load(`800 16px "Tajawal"`),
      document.fonts.load(`700 16px "Tajawal"`),
      document.fonts.load(`400 16px "Tajawal"`),
    ]);
  } catch { /* best-effort */ }

  /* ── Supabase data fetching (unchanged) ─────────────────── */
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
  const extraHats     = (extraHatsRes.data    || []) as any[];

  const isKit      = order.order_type === 'ready_kit';
  const kit        = isKit ? order.ready_kits : null;
  const abayaColor = isKit ? kit?.abaya_color  : order.custom_abaya_color;
  const scarfColor = isKit ? kit?.scarf_color  : order.custom_scarf_color;
  const hatColor   = isKit ? kit?.hat_color    : order.custom_hat_color;
  const sleeveColor = isKit ? (kit?.sleeve_color || '') : (order.sleeve_color || '');
  const sleeveStyle = isKit ? kit?.sleeve_styles : order.sleeve_styles;

  let shippingCityName = '';
  if (order.shipping_city_id) {
    const { data: cityData } = await supabase.from('cities').select('name').eq('id', order.shipping_city_id).single();
    shippingCityName = cityData?.name || '';
  }

  const logoBase64 = await toBase64(window.location.origin + '/logo.svg');

  /* Preload scarf images */
  const scarfStyleImgs = new Map<string, string>();
  const scarfDateImgs  = new Map<string, string>();
  for (const sd of scarfDesigns) {
    if (sd.scarf_styles?.image_url) scarfStyleImgs.set(sd.id, await toBase64(sd.scarf_styles.image_url));
    if (sd.date_types?.image_url)   scarfDateImgs.set(sd.id,  await toBase64(sd.date_types.image_url));
  }

  /* Preload hat images */
  const hatImgs = new Map<string, string>();
  const hatIds  = new Set<string>();
  students.forEach((s: any) => s.hat_embroidery_id && hatIds.add(s.hat_embroidery_id));
  extraHats.forEach((h: any) => h.hat_embroidery_id && hatIds.add(h.hat_embroidery_id));
  for (const id of hatIds) {
    const { data } = await supabase.from('hat_embroideries').select('image_url').eq('id', id).single();
    if (data?.image_url) hatImgs.set(id, await toBase64(data.image_url));
  }

  /* Wait for embedded font CSS (started above in parallel) */
  const fontCss = await fontCssPromise;

  const pages: HTMLDivElement[] = [];
  const sc  = order.student_count       || 0;
  const esc = order.extra_scarf_count   || 0;
  const ehc = order.extra_hat_count     || 0;

  // ══════════════════════════════════════
  // PAGE 1 — Order Info + Abaya Details
  // ══════════════════════════════════════
  {
    const { outer: p, inner: content } = makePage(logoBase64);
    let h = `<div style="text-align:right;">${sectionBanner('بيانات الطلب')}</div>`;
    let rows = '';
    const addIf = (l: string, v: any) => { if (v && v !== 0) rows += row(l, String(v)); };
    addIf('رقم الطلب',         order.order_number);
    addIf('تاريخ الطلب',       order.created_at ? new Date(order.created_at).toLocaleDateString('ar-SA') : '');
    addIf('مدة التنفيذ (أيام)', order.execution_duration);
    addIf('اسم القائدة',       order.leader_name);
    addIf('اسم المدرسة',       order.school_name);
    addIf('نوع الطلب',         isKit ? 'طقم جاهز' : 'تفصيل');
    if (isKit && kit?.name) addIf('اسم الطقم', kit.name);
    if (sc)  addIf('عدد الأطقم',          sc);
    if (esc) addIf('الأوشحة الإضافية',    esc);
    if (ehc) addIf('القبعات الإضافية',    ehc);
    h += card(rows);

    if (sc > 0 && (abayaColor || sleeveStyle || sleeveColor)) {
      h += `<div style="margin-top:26px;text-align:right;">${sectionBanner('تفاصيل العباية')}</div>`;
      let ar = '';
      if (abayaColor)       ar += row('لون العباية',    abayaColor);
      if (order.abaya_length) ar += row('طول العباية', order.abaya_length);
      if (sleeveStyle?.name)  ar += row('طرف الكم',    sleeveStyle.name);
      if (sleeveColor)        ar += row('لون طرف الكم', sleeveColor);
      h += card(ar);
    }
    content.innerHTML = h;
    pages.push(p);
  }

  // ══════════════════════════════════════
  // PAGE — Scarf Designs
  // ══════════════════════════════════════
  if (scarfDesigns.length > 0) {
    const { outer: p, inner: content } = makePage(logoBase64);
    let h = `<div style="text-align:right;">${sectionBanner('تصاميم الأوشحة')}</div>`;

    if (scarfColor) {
      h += `<div style="text-align:center;margin-bottom:14px;font-size:13px;color:#7c6fa0;`
         + `font-family:${FONT};line-height:2;${TF}">لون الوشاح: `
         + `<strong style="color:#1a1a2e;">${scarfColor}</strong></div>`;
    }

    if (order.logo_embroidery_enabled || order.back_embroidery_enabled) {
      let svc = '';
      if (order.logo_embroidery_enabled && order.logo_embroidery_count)
        svc += row('تطريز الشعار',   `${order.logo_embroidery_count}`);
      if (order.back_embroidery_enabled && order.back_embroidery_count)
        svc += row('التطريز الخلفي', `${order.back_embroidery_count}`);
      if (svc)
        h += `<div style="max-width:420px;margin:0 auto 16px;background:#f8f7fc;border-radius:14px;padding:14px;border:1px solid ${BRAND}18;">`
           + `<p style="font-size:13px;font-weight:700;color:${BRAND};margin:0 0 8px;line-height:2;font-family:${FONT};${TF}white-space:nowrap;">خدمات التطريز</p>${svc}</div>`;
    }

    const count = scarfDesigns.length;
    const boxW  = count >= 4 ? 340 : 360;
    const imgH  = count >= 4 ? 118 : 156;

    h += `<div style="display:flex;flex-wrap:wrap;gap:14px;justify-content:center;">`;
    scarfDesigns.forEach((sd: any, i: number) => {
      const styleImg = scarfStyleImgs.get(sd.id);
      const dateImg  = scarfDateImgs.get(sd.id);

      h += `<div style="width:${boxW}px;border:1px solid ${BRAND}16;border-radius:14px;`
         + `overflow:hidden;background:#fff;box-shadow:0 3px 14px rgba(68,3,118,0.06);">`;

      /* card header */
      h += `<div style="padding:8px 14px;display:flex;align-items:center;gap:8px;`
         + `background:linear-gradient(135deg,${BRAND}0c,${BRAND_LIGHT}07);border-bottom:1px solid ${BRAND}12;">`
         + badge(String(i + 1), 26)
         + `<span style="font-weight:700;font-size:13px;color:${BRAND};font-family:${FONT};line-height:2;${TF}white-space:nowrap;">وشاح ${i + 1}</span></div>`;

      /* images */
      h += `<div style="display:flex;padding:10px;gap:10px;justify-content:center;background:#fafafa;">`;
      if (styleImg)
        h += `<div style="flex:1;max-width:${Math.floor(boxW * 0.5)}px;height:${imgH}px;`
           + `border-radius:10px;overflow:hidden;border:1px solid ${BRAND}12;`
           + `display:flex;align-items:center;justify-content:center;background:#fff;`
           + `box-shadow:0 1px 6px rgba(68,3,118,0.05);">`
           + `<img src="${styleImg}" style="max-width:92%;max-height:92%;object-fit:contain;" /></div>`;
      if (dateImg)
        h += `<div style="width:${Math.floor(imgH * 0.6)}px;height:${imgH}px;`
           + `border-radius:10px;overflow:hidden;border:1px solid ${BRAND}12;`
           + `display:flex;align-items:center;justify-content:center;background:#fff;`
           + `box-shadow:0 1px 6px rgba(68,3,118,0.05);">`
           + `<img src="${dateImg}" style="max-width:88%;max-height:92%;object-fit:contain;" /></div>`;
      h += `</div>`;

      /* details */
      h += `<div style="padding:6px 14px 12px;">`;
      const detail = (l: string, v: string) => {
        if (v) h += `<p style="font-size:10px;color:#7c6fa0;margin:3px 0;line-height:2;font-family:${FONT};${TF}">`
                  + `${l}: <strong style="color:#1a1a2e;">${v}</strong></p>`;
      };
      detail('التصميم',       sd.scarf_styles?.name);
      detail('الطرف',         sd.scarf_methods?.name);
      detail('اتجاه التطريز', sd.embroidery_directions?.name);
      detail('التاريخ',       sd.date_types?.name);
      detail('الخط',          sd.fonts?.name);
      detail('لون التطريز',   sd.embroidery_color);
      h += `</div></div>`;
    });
    h += `</div>`;
    content.innerHTML = h;
    pages.push(p);
  }

  // ══════════════════════════════════════
  // PAGE — Hat Designs
  // ══════════════════════════════════════
  const hasHats = students.some((s: any) => s.hat_embroidery_id) || extraHats.length > 0;
  if (hasHats) {
    const { outer: p, inner: content } = makePage(logoBase64);
    let h = `<div style="text-align:right;">${sectionBanner('تصاميم القبعات')}</div>`;

    if (hatColor)
      h += `<div style="text-align:center;margin-bottom:14px;font-size:13px;color:#7c6fa0;`
         + `font-family:${FONT};line-height:2;${TF}">لون القبعة: `
         + `<strong style="color:#1a1a2e;">${hatColor}</strong></div>`;

    if (order.hat_embroidery_enabled && order.hat_embroidery_count)
      h += `<div style="max-width:420px;margin:0 auto 16px;background:#f8f7fc;border-radius:14px;`
         + `padding:14px;border:1px solid ${BRAND}18;box-shadow:0 2px 10px rgba(68,3,118,0.04);">`
         + row('عدد تطريز القبعات', `${order.hat_embroidery_count}`) + `</div>`;

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

    const boxW    = groups.length > 3 ? 220 : 320;
    const imgSize = groups.length > 3 ? 78  : 98;

    h += `<div style="display:flex;flex-wrap:wrap;gap:14px;justify-content:center;">`;
    groups.forEach((g, i) => {
      h += `<div style="width:${boxW}px;border:1px solid ${BRAND}16;border-radius:14px;`
         + `overflow:hidden;background:#fff;box-shadow:0 3px 14px rgba(68,3,118,0.06);display:flex;">`;
      if (g.img)
        h += `<div style="width:${imgSize + 20}px;min-height:${imgSize + 30}px;`
           + `display:flex;align-items:center;justify-content:center;`
           + `background:#fafafa;border-left:1px solid ${BRAND}12;">`
           + `<img src="${g.img}" style="max-width:${imgSize}px;max-height:${imgSize}px;object-fit:contain;" /></div>`;

      h += `<div style="flex:1;padding:12px;line-height:2;">`;
      h += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">`
         + badge(String(i + 1), 24)
         + `<span style="font-weight:700;font-size:12px;color:${BRAND};font-family:${FONT};${TF}white-space:nowrap;">قبعة ${i + 1}</span></div>`;
      h += `<p style="font-size:10px;color:#7c6fa0;margin:3px 0;font-family:${FONT};${TF}">الاسم: <strong style="color:#1a1a2e;">${g.name}</strong></p>`;
      h += `<p style="font-size:10px;color:#7c6fa0;margin:3px 0;font-family:${FONT};${TF}">الكمية: <strong style="color:#1a1a2e;">${g.count}</strong></p>`;
      if (g.fringes.length > 0)
        h += `<p style="font-size:10px;color:#7c6fa0;margin:3px 0;font-family:${FONT};${TF}">الهدب: <strong style="color:#1a1a2e;">${g.fringes.join('، ')}</strong></p>`;
      h += `</div></div>`;
    });
    h += `</div>`;
    content.innerHTML = h;
    pages.push(p);
  }

  // ══════════════════════════════════════
  // PAGES — Names Table
  // ══════════════════════════════════════
  const ROWS_PER_PAGE = 18;
  const scarfCodeMap  = new Map<string, number>();
  scarfDesigns.forEach((sd: any, i: number) => scarfCodeMap.set(sd.id, i + 1));

  const hasBackCol    = students.some(s => s.back_embroidery_text?.trim())    || extraScarves.some(s => s.back_embroidery_text?.trim());
  const hasLogoCol    = students.some(s => s.has_logo_embroidery)             || extraScarves.some(s => s.has_logo_embroidery);
  const hasHatTextCol = students.some(s => {
    const hn = s.hat_embroideries?.name || '';
    return hn !== 'بدون تطريز' && s.hat_embroidery_id;
  }) || extraHats.some(h => h.hat_embroidery_id && h.hat_embroideries?.name !== 'بدون تطريز');

  const hatDesignOrder: string[] = [];
  const hatDesignMap   = new Map<string, number>();
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
    const sn    = s.scarf_design_id ? String(scarfCodeMap.get(s.scarf_design_id) || '') : '';
    const hn    = s.hat_embroideries?.name || '';
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
      const label = totalNamePages > 1
        ? `قائمة الأسماء (${pi + 1}/${totalNamePages})`
        : 'قائمة الأسماء';
      let h = `<div style="text-align:right;">${sectionBanner(label)}</div>`;

      /* th / td style helpers – unicode-bidi:isolate on every cell */
      const thS = `padding:10px 8px;font-size:10px;font-weight:700;color:white;`
                + `text-align:center;vertical-align:middle;line-height:2;`
                + `font-family:${FONT};${TF}white-space:nowrap;`;
      const tdS = (bg: string) =>
        `padding:9px 6px;font-size:10px;text-align:center;vertical-align:middle;`
        + `background:${bg};line-height:2;font-family:${FONT};`
        + `border-bottom:1px solid #e8e4f0;${TF}`;

      h += `<div style="overflow:hidden;border-radius:14px;border:1px solid ${BRAND}14;`
         + `box-shadow:0 3px 14px rgba(68,3,118,0.06);">`;
      h += `<table style="width:100%;border-collapse:collapse;">`;
      h += `<thead><tr style="background:linear-gradient(135deg,${BRAND},${BRAND_LIGHT});">`;
      h += `<th style="${thS}width:32px;">#</th>`;
      h += `<th style="${thS}">الاسم</th>`;
      h += `<th style="${thS}width:42px;">المقاس</th>`;
      h += `<th style="${thS}width:50px;">الوشاح</th>`;
      if (hasHatTextCol) h += `<th style="${thS}width:110px;">القبعة</th>`;
      if (hasBackCol)    h += `<th style="${thS}width:95px;">تطريز خلفي</th>`;
      if (hasLogoCol)    h += `<th style="${thS}width:40px;">شعار</th>`;
      h += `</tr></thead><tbody>`;

      const pageRows = allRows.slice(pi * ROWS_PER_PAGE, (pi + 1) * ROWS_PER_PAGE);
      pageRows.forEach((r, i) => {
        const bg = i % 2 === 0 ? '#ffffff' : '#f8f7fc';
        h += `<tr>`;
        h += `<td style="${tdS(bg)}font-weight:700;color:${BRAND};">${r.serial}</td>`;
        h += `<td style="${tdS(bg)}text-align:right;padding-right:12px;color:#1a1a2e;">${r.name}</td>`;
        h += `<td style="${tdS(bg)}">${r.size}</td>`;
        h += `<td style="${tdS(bg)}">${r.scarfNum ? circle(r.scarfNum, 24) : ''}</td>`;
        if (hasHatTextCol) {
          h += `<td style="${tdS(bg)}">`;
          if (r.hatDesignNum) {
            h += `<div style="display:flex;align-items:center;justify-content:center;gap:4px;">`
               + circle(r.hatDesignNum, 22);
            if (r.hatExtraText)
              h += `<span style="font-size:9px;color:#7c6fa0;font-family:${FONT};${TF}">(${r.hatExtraText})</span>`;
            h += `</div>`;
          }
          h += `</td>`;
        }
        if (hasBackCol)
          h += `<td style="${tdS(bg)}font-size:9px;color:#1a1a2e;">${r.backText}</td>`;
        if (hasLogoCol)
          h += `<td style="${tdS(bg)}">${r.hasLogo ? `<span style="color:#16a34a;font-size:14px;font-weight:700;">✓</span>` : ''}</td>`;
        h += `</tr>`;
      });
      h += `</tbody></table></div>`;
      content.innerHTML = h;
      pages.push(p);
    }
  }

  // ══════════════════════════════════════
  // PAGE — Shipping + Thank You
  // ══════════════════════════════════════
  const hasShipping = order.recipient_name || order.recipient_phone || shippingCityName;
  {
    const { outer: p, inner: content } = makePage(logoBase64);
    let h = '';

    if (hasShipping) {
      h += `<div style="text-align:right;">${sectionBanner('بيانات الشحن')}</div>`;
      let sr = '';
      if (order.recipient_name)  sr += row('اسم المستلم',    order.recipient_name);
      if (order.recipient_phone) sr += row('رقم الجوال',     order.recipient_phone);
      if (shippingCityName)      sr += row('المدينة',         shippingCityName);
      if (order.district)        sr += row('الحي',            order.district);
      if (order.address_details) sr += row('تفاصيل العنوان', order.address_details);
      if (order.national_address) sr += row('العنوان الوطني', order.national_address);
      h += `<div style="max-width:450px;margin:0 auto;">${card(sr)}</div>`;
    }

    h += `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;margin-top:${hasShipping ? '56' : '180'}px;">`
       + `<div style="width:72px;height:72px;border-radius:50%;`
       + `background:linear-gradient(135deg,${BRAND}18,${BRAND_LIGHT}22);`
       + `display:flex;align-items:center;justify-content:center;margin-bottom:22px;`
       + `border:2px solid ${BRAND}20;box-shadow:0 4px 16px rgba(68,3,118,0.10);">`
       + `<span style="font-size:32px;">✨</span></div>`
       + `<h2 style="font-size:26px;font-weight:700;color:${BRAND};margin:0 0 12px;font-family:${FONT};white-space:nowrap;${TF}">شكراً لكم</h2>`
       + `<p style="font-size:14px;color:#7c6fa0;text-align:center;max-width:380px;line-height:2.4;margin:0;font-family:${FONT};${TF}">نشكركم على ثقتكم بمتجر Areba ونسعد بخدمتكم دائماً</p>`
       + `<div style="margin-top:28px;width:80px;height:3px;background:linear-gradient(to right,${BRAND},${BRAND_LIGHT});border-radius:2px;"></div>`
       + `</div>`;
    content.innerHTML = h;
    pages.push(p);
  }

  // ══════════════════════════════════════
  // CAPTURE → PDF
  // ══════════════════════════════════════
  const doc = new jsPDF({ orientation: 'portrait', unit: 'px', format: [A4_W, A4_H] });

  for (let i = 0; i < pages.length; i++) {
    if (i > 0) doc.addPage([A4_W, A4_H]);
    const canvas  = await capture(pages[i], fontCss);
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    doc.addImage(imgData, 'JPEG', 0, 0, A4_W, A4_H);
  }

  doc.save(`order-${order.order_number || orderId}.pdf`);
  document.head.removeChild(fontLink);
}
