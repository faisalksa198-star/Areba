import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { loadOrderReportData, ReportData } from '@/lib/orderReportData';
import './PrintCustomerReport.css';

export default function PrintCustomerReport() {
  const { orderId } = useParams<{ orderId: string }>();
  const [params] = useSearchParams();
  const autoPrint = params.get('autoprint') === '1';
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    loadOrderReportData(orderId)
      .then(setData)
      .catch((e) => setError(e?.message || 'حدث خطأ'));
  }, [orderId]);

  useEffect(() => {
    if (!data || !autoPrint) return;
    // Wait for fonts + images
    const imgs = Array.from(document.images);
    Promise.all(
      imgs.map(img => img.complete ? Promise.resolve() : new Promise(res => {
        img.onload = img.onerror = () => res(null);
      }))
    ).then(() => (document as any).fonts?.ready)
     .then(() => setTimeout(() => window.print(), 300));
  }, [data, autoPrint]);

  if (error) return <div className="pcr-error">خطأ: {error}</div>;
  if (!data) return <div className="pcr-loading">جارٍ تحميل التقرير...</div>;

  const d = data;
  const cols = buildColumns(d);
  const hasShipping = !!(d.recipientName || d.recipientPhone || d.shippingCity);
  const hasProducts = d.scarves.length > 0 || d.hats.length > 0;

  return (
    <div className="pcr-root">
      {/* Cover / Summary */}
      <section className="pcr-page">
        <header className="pcr-brand-header">
          <img src="/logo.svg" alt="آريبا" className="pcr-logo" />
          <div className="pcr-order-tag">
            <span>طلب رقم</span>
            <strong>{d.orderNumber}</strong>
          </div>
        </header>

        <div className="pcr-cover">
          <h1>تقرير الطلب</h1>
          <p>متجر آريبا</p>
          <div className="pcr-divider" />
        </div>

        <SectionTitle>بيانات الطلب</SectionTitle>
        <div className="pcr-card">
          <InfoRow label="رقم الطلب" value={d.orderNumber} />
          {d.createdAt && <InfoRow label="تاريخ الطلب" value={d.createdAt} />}
          {d.executionDuration && <InfoRow label="مدة التنفيذ (أيام)" value={String(d.executionDuration)} />}
          {d.leaderName && <InfoRow label="اسم القائدة" value={d.leaderName} />}
          {d.schoolName && <InfoRow label="اسم المدرسة" value={d.schoolName} />}
          <InfoRow label="نوع الطلب" value={d.orderTypeLabel} />
          {d.kitName && <InfoRow label="اسم الطقم" value={d.kitName} />}
          {!!d.studentCount && <InfoRow label="عدد الأطقم" value={String(d.studentCount)} />}
          {!!d.extraScarfCount && <InfoRow label="الأوشحة الإضافية" value={String(d.extraScarfCount)} />}
          {!!d.extraHatCount && <InfoRow label="القبعات الإضافية" value={String(d.extraHatCount)} />}
        </div>

        {(d.abayaColor || d.sleeveStyleName || d.sleeveColor || d.abayaLength) && (
          <>
            <SectionTitle>تفاصيل العباية</SectionTitle>
            <div className="pcr-card">
              {d.abayaColor && <InfoRow label="لون العباية" value={d.abayaColor} />}
              {d.abayaLength && <InfoRow label="طول العباية" value={d.abayaLength} />}
              {d.sleeveStyleName && <InfoRow label="طرف الكم" value={d.sleeveStyleName} />}
              {d.sleeveColor && <InfoRow label="لون طرف الكم" value={d.sleeveColor} />}
            </div>
          </>
        )}
      </section>

      {/* Products */}
      {hasProducts && (
        <section className="pcr-page pcr-page-break">
          {d.scarves.length > 0 && (
            <>
              <SectionTitle>تصاميم الأوشحة</SectionTitle>
              {d.scarfColor && <p className="pcr-subtle">لون الوشاح: <strong>{d.scarfColor}</strong></p>}
              <div className="pcr-grid">
                {d.scarves.map(sd => (
                  <div className="pcr-product" key={sd.index}>
                    <div className="pcr-product-head">
                      <span className="pcr-badge">{sd.index}</span>
                      <strong>وشاح {sd.index}</strong>
                    </div>
                    {(sd.styleImage || sd.dateImage) && (
                      <div className="pcr-product-imgs">
                        {sd.styleImage && <div className="pcr-img-box"><img src={sd.styleImage} alt="" crossOrigin="anonymous" /></div>}
                        {sd.dateImage && <div className="pcr-img-box pcr-img-box-sm"><img src={sd.dateImage} alt="" crossOrigin="anonymous" /></div>}
                      </div>
                    )}
                    <div className="pcr-product-body">
                      {sd.styleName && <p>التصميم: <strong>{sd.styleName}</strong></p>}
                      {sd.methodName && <p>الطرف: <strong>{sd.methodName}</strong></p>}
                      {sd.embroideryDirection && <p>اتجاه التطريز: <strong>{sd.embroideryDirection}</strong></p>}
                      {sd.dateName && <p>التاريخ: <strong>{sd.dateName}</strong></p>}
                      {sd.fontName && <p>الخط: <strong>{sd.fontName}</strong></p>}
                      {sd.embroideryColor && <p>لون التطريز: <strong>{sd.embroideryColor}</strong></p>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {d.hats.length > 0 && (
            <>
              <SectionTitle>تصاميم القبعات</SectionTitle>
              {d.hatColor && <p className="pcr-subtle">لون القبعة: <strong>{d.hatColor}</strong></p>}
              <div className="pcr-grid">
                {d.hats.map(g => (
                  <div className="pcr-product pcr-hat" key={g.index}>
                    {g.image && <div className="pcr-img-box pcr-img-box-side"><img src={g.image} alt="" crossOrigin="anonymous" /></div>}
                    <div className="pcr-product-body">
                      <div className="pcr-product-head pcr-no-border">
                        <span className="pcr-badge">{g.index}</span>
                        <strong>قبعة {g.index}</strong>
                      </div>
                      <p>الاسم: <strong>{g.name}</strong></p>
                      <p>الكمية: <strong>{g.count}</strong></p>
                      {g.fringes.length > 0 && <p>الهدب: <strong>{g.fringes.join('، ')}</strong></p>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* Students table */}
      {d.students.length > 0 && (
        <section className="pcr-page pcr-page-break">
          <SectionTitle>قائمة الأسماء</SectionTitle>
          <table className="pcr-table">
            <thead>
              <tr>
                {cols.map(c => <th key={c.key} style={{ width: c.width }}>{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {d.students.map((r, i) => (
                <tr key={`${r.serial}-${i}`}>
                  {cols.map(c => (
                    <td key={c.key} className={`pcr-cell-${c.key}`}>
                      {renderCell(c.key, r)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Shipping + Thanks */}
      <section className="pcr-page pcr-page-break">
        {hasShipping && (
          <>
            <SectionTitle>بيانات الشحن</SectionTitle>
            <div className="pcr-card">
              {d.recipientName && <InfoRow label="اسم المستلم" value={d.recipientName} />}
              {d.recipientPhone && <InfoRow label="رقم الجوال" value={d.recipientPhone} />}
              {d.shippingCity && <InfoRow label="المدينة" value={d.shippingCity} />}
              {d.district && <InfoRow label="الحي" value={d.district} />}
              {d.addressDetails && <InfoRow label="تفاصيل العنوان" value={d.addressDetails} />}
              {d.nationalAddress && <InfoRow label="العنوان الوطني" value={d.nationalAddress} />}
            </div>
          </>
        )}
        <div className="pcr-thanks">
          <h2>شكراً لكم</h2>
          <p>نشكركم على ثقتكم بمتجر آريبا ونسعد بخدمتكم دائماً</p>
          <div className="pcr-divider" />
        </div>
      </section>

      {/* Screen-only print button */}
      <div className="pcr-print-bar">
        <button onClick={() => window.print()}>🖨️ طباعة / حفظ PDF</button>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="pcr-section-title"><h3>{children}</h3></div>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="pcr-info-row">
      <span className="pcr-info-label">{label}</span>
      <span className="pcr-info-value">{value}</span>
    </div>
  );
}

function buildColumns(d: ReportData) {
  const cols: { key: string; label: string; width: string }[] = [];
  cols.push({ key: 'serial', label: '#', width: '7%' });
  cols.push({ key: 'name', label: 'الاسم', width: '32%' });
  cols.push({ key: 'size', label: 'المقاس', width: '10%' });
  cols.push({ key: 'scarf', label: 'الوشاح', width: '10%' });
  if (d.hasHatTextCol) cols.push({ key: 'hat', label: 'القبعة', width: '18%' });
  if (d.hasBackCol) cols.push({ key: 'back', label: 'تطريز خلفي', width: '16%' });
  if (d.hasLogoCol) cols.push({ key: 'logo', label: 'شعار', width: '7%' });
  const total = cols.reduce((a, c) => a + parseFloat(c.width), 0);
  cols.forEach(c => { c.width = `${(parseFloat(c.width) / total) * 100}%`; });
  return cols;
}

function renderCell(key: string, r: any) {
  switch (key) {
    case 'serial': return <strong className="pcr-serial">{r.serial}</strong>;
    case 'name': return r.name;
    case 'size': return r.size;
    case 'scarf': return r.scarfNum ? <span className="pcr-circle">{r.scarfNum}</span> : '';
    case 'hat': return (
      <span className="pcr-hat-cell">
        {r.hatDesignNum && <span className="pcr-circle">{r.hatDesignNum}</span>}
        {r.hatExtraText && <span className="pcr-hat-txt">{r.hatExtraText}</span>}
      </span>
    );
    case 'back': return r.backText;
    case 'logo': return r.hasLogo ? <span className="pcr-check">✓</span> : '';
    default: return null;
  }
}
