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

type MockScarfDesign = {
  index: number;
  styleName: string;
  methodName: string;
  embroideryDirection: string;
  dateName: string;
  fontName: string;
  embroideryColor: string;
  styleImage?: string;
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

const SCARFS_PER_PAGE = 4;

const mockScarfDesigns: MockScarfDesign[] = Array.from({ length: 4 }, (_, index) => ({
  index: index + 1,
  methodName: 'وشاح مقوس من الخلف',
  dateName: 'ميلادي عمودي بالإنجليزي',
  styleName: 'قيطان ذهبي',
  embroideryDirection: 'بالطول',
  fontName: 'خط الثلث عادي',
  embroideryColor: 'ذهبي',
}));

function chunkScarfDesigns(scarves: MockScarfDesign[]) {
  const pages: MockScarfDesign[][] = [];

  for (let index = 0; index < scarves.length; index += SCARFS_PER_PAGE) {
    pages.push(scarves.slice(index, index + SCARFS_PER_PAGE));
  }

  return pages;
}

function displayValue(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed || '-';
}

export default function PrintCustomerReport() {
  const [params] = useSearchParams();
  const autoPrint = params.get('autoprint') === '1';
  const scarfPages = chunkScarfDesigns(mockScarfDesigns);

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

      {scarfPages.map((scarves, pageIndex) => (
        <ScarfDesignPage
          key={pageIndex}
          pageNumber={pageIndex + 3}
          scarves={scarves}
          scarfColor="مخمل أسود"
          backEmbroideryCount={12}
          logoEmbroideryCount={8}
        />
      ))}

      <div className="pcr-print-bar">
        <button onClick={() => window.print()}>طباعة / حفظ PDF</button>
      </div>
    </div>
  );
}

function ScarfDesignPage({
  pageNumber,
  scarves,
  scarfColor,
  backEmbroideryCount,
  logoEmbroideryCount,
}: {
  pageNumber: number;
  scarves: MockScarfDesign[];
  scarfColor?: string | null;
  backEmbroideryCount?: number;
  logoEmbroideryCount?: number;
}) {
  return (
    <ReportPage pageNumber={pageNumber}>
      <header className="pcr-page-two-header pcr-scarf-page-header">
        <img src="/logo.svg" alt="AREBA" className="pcr-logo-small" />
        <DecoratedTitle>تصاميم الأوشحة</DecoratedTitle>
      </header>

      <ScarfSummaryCard
        scarfColor={scarfColor}
        backEmbroideryCount={backEmbroideryCount}
        logoEmbroideryCount={logoEmbroideryCount}
      />

      <section className="pcr-scarf-grid" aria-label="تصاميم الأوشحة">
        {scarves.map(scarf => (
          <ScarfDesignCard key={scarf.index} scarf={scarf} />
        ))}
      </section>
    </ReportPage>
  );
}

function ScarfSummaryCard({
  scarfColor,
  backEmbroideryCount = 0,
  logoEmbroideryCount = 0,
}: {
  scarfColor?: string | null;
  backEmbroideryCount?: number;
  logoEmbroideryCount?: number;
}) {
  const services = [
    backEmbroideryCount > 0
      ? { label: 'تطريز في الخلف', quantity: backEmbroideryCount }
      : null,
    logoEmbroideryCount > 0
      ? { label: 'شعار', quantity: logoEmbroideryCount }
      : null,
  ].filter(Boolean) as { label: string; quantity: number }[];

  return (
    <section className="pcr-scarf-summary" aria-label="ملخص الأوشحة">
      <div className="pcr-scarf-summary-item pcr-scarf-summary-color">
        <IconBubble>
          <Palette />
        </IconBubble>
        <strong>لون الوشاح :</strong>
        <span>{displayValue(scarfColor)}</span>
      </div>

      {services.length > 0 && (
        <div className="pcr-scarf-summary-item pcr-scarf-summary-services">
          <strong>خدمات التطريز :</strong>
          <ul>
            {services.map(service => (
              <li key={service.label}>
                <span>{service.label}</span>
                <b>{service.quantity}</b>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function ScarfDesignCard({ scarf }: { scarf: MockScarfDesign }) {
  const rows: InfoItem[] = [
    { label: 'التصميم', value: displayValue(scarf.methodName), icon: FileText },
    { label: 'التاريخ', value: displayValue(scarf.dateName), icon: CalendarDays },
    { label: 'طرف الوشاح', value: displayValue(scarf.styleName), icon: Sparkles },
    { label: 'اتجاه التطريز', value: displayValue(scarf.embroideryDirection), icon: Ruler },
    { label: 'الخط', value: displayValue(scarf.fontName), icon: Shirt },
    { label: 'لون التطريز', value: displayValue(scarf.embroideryColor), icon: Palette },
  ];

  return (
    <article className="pcr-scarf-card">
      <div className="pcr-scarf-card-pill">وشاح {scarf.index}</div>

      <div className="pcr-scarf-preview" aria-hidden="true">
        {scarf.styleImage ? (
          <img src={scarf.styleImage} alt="" />
        ) : (
          <div className="pcr-scarf-preview-placeholder">
            <span />
            <span />
          </div>
        )}
      </div>

      <div className="pcr-scarf-table">
        {rows.map(row => (
          <div className="pcr-scarf-table-row" key={row.label}>
            <row.icon />
            <strong>{row.label} :</strong>
            <span>{row.value}</span>
          </div>
        ))}
      </div>
    </article>
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
