import { useEffect, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CalendarDays,
  CheckCircle2,
  FileText,
  GraduationCap,
  Home,
  MapPin,
  Palette,
  Phone,
  Ruler,
  Shirt,
  Sparkles,
  type LucideIcon,
  UserRound,
} from 'lucide-react';
import './PrintCustomerReport.css';

type InfoItem = {
  label: string;
  value: string;
  icon: LucideIcon;
};

type DetailItem = InfoItem & {
  preview?: 'abaya' | 'sleeve';
};

const orderInfoRows: InfoItem[] = [
  { label: 'رقم الطلب', value: '#12345', icon: FileText },
  { label: 'تاريخ الطلب', value: '24 / 05 / 2026', icon: CalendarDays },
  { label: 'اسم القائدة', value: 'أمل محمد', icon: UserRound },
];

const quantityCards: InfoItem[] = [
  { label: 'عدد الأطقم', value: '12', icon: Shirt },
  { label: 'عدد الأوشحة', value: '18', icon: Sparkles },
  { label: 'عدد القبعات', value: '12', icon: GraduationCap },
];

const deliveryRows: InfoItem[] = [
  { label: 'اسم المستلم', value: 'سارة أحمد', icon: UserRound },
  { label: 'رقم الجوال', value: '0501234567', icon: Phone },
  { label: 'المدينة', value: 'الرياض', icon: MapPin },
  { label: 'الحي', value: 'الياسمين', icon: Home },
];

const abayaRows: DetailItem[] = [
  { label: 'لون العباية', value: 'اسود', icon: Palette },
  { label: 'طول العباية', value: 'ثابت', icon: Ruler },
  { label: 'تصميم العباية', value: 'اريبة كلوش', icon: Shirt, preview: 'abaya' },
  { label: 'طرف الكم', value: 'عريض مع قيطان', icon: Sparkles, preview: 'sleeve' },
  { label: 'لون طرف الكم', value: 'مخمل اسود', icon: Palette },
];

export default function PrintCustomerReport() {
  const [params] = useSearchParams();
  const autoPrint = params.get('autoprint') === '1';

  useEffect(() => {
    if (!autoPrint) return;

    const imgs = Array.from(document.images);
    Promise.all(
      imgs.map(img => img.complete ? Promise.resolve() : new Promise(res => {
        img.onload = img.onerror = () => res(null);
      }))
    )
      .then(() => (document as any).fonts?.ready)
      .then(() => setTimeout(() => window.print(), 300));
  }, [autoPrint]);

  return (
    <div className="pcr-root">
      <ReportPage pageNumber={1} footerLabel="تاريخ إنشاء التقرير">
        <header className="pcr-page-one-header">
          <img src="/logo.svg" alt="AREBA" className="pcr-logo-large" />
          <DecoratedTitle>تقرير تفاصيل الطلب</DecoratedTitle>
        </header>

        <section className="pcr-outline-panel pcr-order-panel" aria-label="معلومات الطلب">
          <RibbonTitle>معلومات الطلب</RibbonTitle>
          <div className="pcr-info-table">
            {orderInfoRows.map(row => (
              <InfoLine key={row.label} {...row} />
            ))}
          </div>
        </section>

        <section className="pcr-quantities" aria-label="الكميات المطلوبة">
          <RibbonTitle>الكميات المطلوبة</RibbonTitle>
          <div className="pcr-quantity-grid">
            {quantityCards.map(item => (
              <div className="pcr-quantity-card" key={item.label}>
                <IconBubble>
                  <item.icon />
                </IconBubble>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="pcr-outline-panel pcr-delivery-panel" aria-label="معلومات الاستلام">
          <RibbonTitle>معلومات الاستلام</RibbonTitle>
          <div className="pcr-info-table">
            {deliveryRows.map(row => (
              <InfoLine key={row.label} {...row} />
            ))}
          </div>
        </section>

        <div className="pcr-status-pill">
          <CheckCircle2 />
          <span>حالة الطلب : قيد التنفيذ</span>
        </div>
      </ReportPage>

      <ReportPage pageNumber={2}>
        <header className="pcr-page-two-header">
          <img src="/logo.svg" alt="AREBA" className="pcr-logo-small" />
          <DecoratedTitle>تفاصيل العباية</DecoratedTitle>
        </header>

        <section className="pcr-abaya-list" aria-label="تفاصيل العباية">
          {abayaRows.map(row => (
            <DetailRow key={row.label} {...row} />
          ))}
        </section>
      </ReportPage>

      <div className="pcr-print-bar">
        <button onClick={() => window.print()}>طباعة / حفظ PDF</button>
      </div>
    </div>
  );
}

function ReportPage({
  children,
  pageNumber,
  footerLabel,
}: {
  children: ReactNode;
  pageNumber: number;
  footerLabel?: string;
}) {
  return (
    <section className={`pcr-page pcr-page-${pageNumber}`}>
      <Decorations />
      <main className="pcr-page-content">{children}</main>
      <Footer pageNumber={pageNumber} label={footerLabel} />
    </section>
  );
}

function Decorations() {
  return (
    <>
      <div className="pcr-corner-ribbon" />
      <div className="pcr-leaf pcr-leaf-top">
        <span /><span /><span /><span />
      </div>
      <div className="pcr-leaf pcr-leaf-bottom">
        <span /><span /><span />
      </div>
      <div className="pcr-dot-grid" />
      <div className="pcr-curve pcr-curve-top" />
      <div className="pcr-curve pcr-curve-side" />
      <div className="pcr-footer-line" />
      <div className="pcr-footer-wave pcr-footer-wave-soft" />
      <div className="pcr-footer-wave pcr-footer-wave-main" />
    </>
  );
}

function DecoratedTitle({ children }: { children: ReactNode }) {
  return (
    <div className="pcr-title-block">
      <h1>{children}</h1>
      <div className="pcr-title-divider">
        <span />
      </div>
    </div>
  );
}

function RibbonTitle({ children }: { children: ReactNode }) {
  return (
    <div className="pcr-ribbon-title">
      <span>{children}</span>
    </div>
  );
}

function InfoLine({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <div className="pcr-info-line">
      <div className="pcr-info-label">
        <Icon />
        <span>{label} :</span>
      </div>
      <strong>{value}</strong>
    </div>
  );
}

function DetailRow({
  label,
  value,
  icon: Icon,
  preview,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  preview?: 'abaya' | 'sleeve';
}) {
  return (
    <div className={`pcr-detail-row ${preview ? 'pcr-detail-row-tall' : ''}`}>
      <div className="pcr-detail-label">
        <IconBubble>
          <Icon />
        </IconBubble>
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
      {preview && (
        <div className="pcr-preview-frame" aria-hidden="true">
          <div className={`pcr-product-preview pcr-product-preview-${preview}`} />
        </div>
      )}
    </div>
  );
}

function IconBubble({ children }: { children: ReactNode }) {
  return <span className="pcr-icon-bubble">{children}</span>;
}

function Footer({ pageNumber, label }: { pageNumber: number; label?: string }) {
  return (
    <footer className="pcr-footer">
      <div className="pcr-footer-date">
        <CalendarDays />
        <span>24 / 05 / 2026</span>
        {label && <em>{label}</em>}
      </div>
      <Sparkles className="pcr-footer-mark" />
      <div className="pcr-page-number">Page {pageNumber}</div>
    </footer>
  );
}
