import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
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
import { loadOrderReportData, type ReportData, type ReportHatGroup, type ReportScarfDesign } from '@/lib/orderReportData';
import './PrintCustomerReport.css';

type InfoItem = {
  label: string;
  value: string;
  icon: LucideIcon;
};

type DetailItem = InfoItem & {
  preview?: 'abaya' | 'sleeve';
  imageUrl?: string;
  showFallbackPreview?: boolean;
};

type MockNameRow = {
  index: number;
  name: string;
  size: string;
  scarf: string;
  hat: string;
  backText?: string;
  hasLogo?: boolean;
};

const mockOrderInfoRows: InfoItem[] = [
  { label: 'رقم الطلب', value: '#12345', icon: FileText },
  { label: 'تاريخ الطلب', value: '24 / 05 / 2026', icon: CalendarDays },
  { label: 'اسم القائدة', value: 'أمل محمد', icon: UserRound },
];

const mockQuantityCards: InfoItem[] = [
  { label: 'عدد الأطقم', value: '12', icon: Shirt },
  { label: 'عدد الأوشحة', value: '18', icon: Sparkles },
  { label: 'عدد القبعات', value: '12', icon: GraduationCap },
];

const mockDeliveryRows: InfoItem[] = [
  { label: 'اسم المستلم', value: 'سارة أحمد', icon: UserRound },
  { label: 'رقم الجوال', value: '0501234567', icon: Phone },
  { label: 'المدينة', value: 'الرياض', icon: MapPin },
  { label: 'الحي', value: 'الياسمين', icon: Home },
];

const mockAbayaRows: DetailItem[] = [
  { label: 'لون العباية', value: 'اسود', icon: Palette },
  { label: 'طول العباية', value: 'ثابت', icon: Ruler },
  { label: 'تصميم العباية', value: 'اريبة كلوش', icon: Shirt, preview: 'abaya', showFallbackPreview: true },
  { label: 'طرف الكم', value: 'عريض مع قيطان', icon: Sparkles, preview: 'sleeve', showFallbackPreview: true },
  { label: 'لون طرف الكم', value: 'مخمل اسود', icon: Palette },
];

const SCARFS_PER_PAGE = 4;
const HATS_PER_PAGE = 4;

function chunkScarfDesigns(scarves: ReportScarfDesign[]) {
  const pages: ReportScarfDesign[][] = [];

  for (let index = 0; index < scarves.length; index += SCARFS_PER_PAGE) {
    pages.push(scarves.slice(index, index + SCARFS_PER_PAGE));
  }

  return pages;
}

function getScarfPages(scarves: ReportScarfDesign[]) {
  const pages = chunkScarfDesigns(scarves);
  return pages.length > 0 ? pages : [[]];
}

function chunkHatDesigns(hats: ReportHatGroup[]) {
  const pages: ReportHatGroup[][] = [];

  for (let index = 0; index < hats.length; index += HATS_PER_PAGE) {
    pages.push(hats.slice(index, index + HATS_PER_PAGE));
  }

  return pages;
}

function getHatPages(hats: ReportHatGroup[]) {
  const pages = chunkHatDesigns(hats);
  return pages.length > 0 ? pages : [[]];
}

const mockNameRows: MockNameRow[] = [
  { index: 1, name: 'يارا فيصل المطيري', size: '48', scarf: '1', hat: '1' },
  { index: 2, name: 'دانه المطيري', size: '50', scarf: '2', hat: '1', backText: 'حققت حلمي لأجل زهر' },
  { index: 3, name: 'دالين نواف', size: '52', scarf: '4', hat: '3', hasLogo: true },
  { index: 4, name: 'تالا ساير', size: '54', scarf: '1', hat: '2' },
  { index: 5, name: 'ملك عبدالله الشلاحي', size: '56', scarf: '1', hat: '4' },
  { index: 6, name: 'يارا فيصل المطيري', size: '48', scarf: '1', hat: '1' },
  { index: 7, name: 'دانه المطيري', size: '50', scarf: '2', hat: '1', backText: 'حققت حلمي لأجل زهر' },
  { index: 8, name: 'دالين نواف', size: '52', scarf: '4', hat: '3', hasLogo: true },
  { index: 9, name: 'تالا ساير', size: '54', scarf: '1', hat: '2' },
  { index: 10, name: 'ملك عبدالله الشلاحي', size: '56', scarf: '1', hat: '4' },
  { index: 11, name: 'يارا فيصل المطيري', size: '48', scarf: '1', hat: '1' },
  { index: 12, name: 'دانه المطيري', size: '50', scarf: '2', hat: '1', backText: 'حققت حلمي لأجل زهر' },
];

function displayValue(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed || '-';
}

function buildOrderInfoRows(reportData: ReportData | null): InfoItem[] {
  if (!reportData) return mockOrderInfoRows;

  return [
    { label: 'رقم الطلب', value: displayValue(reportData.orderNumber), icon: FileText },
    { label: 'تاريخ الطلب', value: displayValue(reportData.orderDateFormatted), icon: CalendarDays },
    { label: 'اسم القائدة', value: displayValue(reportData.leaderName), icon: UserRound },
  ];
}

function buildDeliveryRows(reportData: ReportData | null): InfoItem[] {
  if (!reportData) return mockDeliveryRows;

  return [
    { label: 'اسم المستلم', value: displayValue(reportData.recipientName), icon: UserRound },
    { label: 'رقم الجوال', value: displayValue(reportData.recipientPhone), icon: Phone },
    { label: 'المدينة', value: displayValue(reportData.cityName || reportData.shippingCity), icon: MapPin },
    { label: 'الحي', value: displayValue(reportData.district), icon: Home },
  ];
}

function buildQuantityCards(reportData: ReportData | null): InfoItem[] {
  if (!reportData) return mockQuantityCards;

  return [
    { label: 'عدد الأطقم', value: String(reportData.setQuantity), icon: Shirt },
    { label: 'عدد الأوشحة', value: String(reportData.scarfQuantity), icon: Sparkles },
    { label: 'عدد القبعات', value: String(reportData.hatQuantity), icon: GraduationCap },
  ].filter(card => Number(card.value) > 0);
}

function buildAbayaRows(reportData: ReportData | null): DetailItem[] {
  if (!reportData) return mockAbayaRows;

  return [
    { label: 'لون العباية', value: displayValue(reportData.abayaColor), icon: Palette },
    { label: 'طول العباية', value: displayValue(reportData.abayaLength), icon: Ruler },
    {
      label: 'تصميم العباية',
      value: displayValue(reportData.abayaDesignName),
      icon: Shirt,
      preview: 'abaya',
      imageUrl: reportData.abayaDesignImage,
    },
    {
      label: 'طرف الكم',
      value: displayValue(reportData.sleeveStyleName),
      icon: Sparkles,
      preview: 'sleeve',
      imageUrl: reportData.sleeveStyleImage,
    },
    { label: 'لون طرف الكم', value: displayValue(reportData.sleeveColor), icon: Palette },
  ];
}

export default function PrintCustomerReport() {
  const { orderId } = useParams();
  const [params] = useSearchParams();
  const autoPrint = params.get('autoprint') === '1';
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const showScarfPages = reportData ? reportData.setQuantity > 0 || reportData.scarfQuantity > 0 : false;
  const scarfPages = showScarfPages ? getScarfPages(reportData?.scarves || []) : [];
  const showHatPages = reportData ? reportData.setQuantity > 0 || reportData.hatQuantity > 0 : false;
  const hatPages = showHatPages ? getHatPages(reportData?.hats || []) : [];
  const showAbayaPage = !reportData || reportData.setQuantity > 0;
  const abayaPageOffset = showAbayaPage ? 1 : 0;
  const firstDesignPageNumber = 2 + abayaPageOffset;
  const namesPageNumber = scarfPages.length + hatPages.length + firstDesignPageNumber;
  const thankYouPageNumber = namesPageNumber + 1;
  const orderInfoRows = useMemo(() => buildOrderInfoRows(reportData), [reportData]);
  const quantityCards = useMemo(() => buildQuantityCards(reportData), [reportData]);
  const deliveryRows = useMemo(() => buildDeliveryRows(reportData), [reportData]);
  const abayaRows = useMemo(() => buildAbayaRows(reportData), [reportData]);
  const statusLabel = reportData ? displayValue(reportData.statusLabel) : 'قيد التنفيذ';

  useEffect(() => {
    if (!orderId) return;

    let cancelled = false;
    setReportError(null);

    loadOrderReportData(orderId)
      .then(data => {
        if (!cancelled) setReportData(data);
      })
      .catch(error => {
        console.error('Failed to load customer report data', error);
        if (!cancelled) setReportError('تعذر تحميل بيانات التقرير');
      });

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  useEffect(() => {
    if (!autoPrint) return;
    if (orderId && !reportData && !reportError) return;

    const imgs = Array.from(document.images);
    Promise.all(
      imgs.map(img => img.complete ? Promise.resolve() : new Promise(res => {
        img.onload = img.onerror = () => res(null);
      }))
    )
      .then(() => (document as any).fonts?.ready)
      .then(() => setTimeout(() => window.print(), 300));
  }, [autoPrint, orderId, reportData, reportError]);

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
          <div className={`pcr-quantity-grid pcr-quantity-grid-${quantityCards.length}`}>
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
          <span>حالة الطلب : {statusLabel}</span>
        </div>
      </ReportPage>

      {showAbayaPage && (
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
      )}

      {scarfPages.map((scarves, pageIndex) => (
        <ScarfDesignPage
          key={pageIndex}
          pageNumber={firstDesignPageNumber + pageIndex}
          scarves={scarves}
          scarfColor={reportData?.scarfColor}
          backEmbroideryCount={reportData?.backEmbroideryCount}
          logoEmbroideryCount={reportData?.logoEmbroideryCount}
        />
      ))}

      {hatPages.map((hats, pageIndex) => (
        <HatDesignPage
          key={pageIndex}
          pageNumber={firstDesignPageNumber + scarfPages.length + pageIndex}
          hats={hats}
          hatColor={reportData?.mainHatFringeColor}
          embroideryCount={reportData?.hatEmbroideryCount || 0}
        />
      ))}

      <NameListPage pageNumber={namesPageNumber} rows={mockNameRows} />
      <ThankYouPage pageNumber={thankYouPageNumber} />

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
  scarves: ReportScarfDesign[];
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

function ScarfDesignCard({ scarf }: { scarf: ReportScarfDesign }) {
  const rows: InfoItem[] = [
    { label: 'التصميم', value: displayValue(scarf.styleName), icon: FileText },
    { label: 'التاريخ', value: displayValue(scarf.dateName), icon: CalendarDays },
    { label: 'طرف الوشاح', value: displayValue(scarf.methodName), icon: Sparkles },
    { label: 'اتجاه التطريز', value: displayValue(scarf.embroideryDirection), icon: Ruler },
    { label: 'الخط', value: displayValue(scarf.fontName), icon: Shirt },
    { label: 'لون التطريز', value: displayValue(scarf.embroideryColor), icon: Palette },
  ];

  return (
    <article className="pcr-scarf-card">
      <div className="pcr-scarf-card-pill">وشاح {scarf.index}</div>

      <div className="pcr-scarf-preview" aria-hidden="true">
        <div className="pcr-scarf-preview-slot pcr-scarf-date-preview">
          {scarf.dateImage && <img src={scarf.dateImage} alt="" />}
        </div>
        <div className="pcr-scarf-preview-slot pcr-scarf-style-preview">
          {scarf.styleImage && <img src={scarf.styleImage} alt="" />}
        </div>
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

function HatDesignPage({
  pageNumber,
  hats,
  hatColor,
  embroideryCount,
}: {
  pageNumber: number;
  hats: ReportHatGroup[];
  hatColor?: string | null;
  embroideryCount: number;
}) {
  return (
    <ReportPage pageNumber={pageNumber}>
      <header className="pcr-page-two-header pcr-hat-page-header">
        <img src="/logo.svg" alt="AREBA" className="pcr-logo-small" />
        <DecoratedTitle>تصاميم القبعات</DecoratedTitle>
      </header>

      <section className="pcr-hat-summary" aria-label="ملخص القبعات">
        <div className="pcr-hat-summary-item pcr-hat-summary-color">
          <IconBubble>
            <Palette />
          </IconBubble>
          <strong>لون القبعة :</strong>
          <span>{displayValue(hatColor)}</span>
        </div>
        <div className="pcr-hat-summary-item pcr-hat-summary-count">
          <strong>عدد تطريز القبعات :</strong>
          <span>{embroideryCount}</span>
        </div>
      </section>

      <section className="pcr-hat-grid" aria-label="تصاميم القبعات">
        {hats.map(hat => (
          <HatDesignCard key={hat.index} hat={hat} />
        ))}
      </section>
    </ReportPage>
  );
}

function HatDesignCard({ hat }: { hat: ReportHatGroup }) {
  const fringeColor = hat.fringes.length > 0 ? hat.fringes.join(' / ') : '-';
  const rows: InfoItem[] = [
    { label: 'العدد', value: `${hat.count} قبعات`, icon: Shirt },
    { label: 'لون الهدب', value: fringeColor, icon: Palette },
  ];

  if (hat.hasExtraText && hat.customText) {
    rows.push({ label: 'الاسم على التطريز', value: hat.customText, icon: FileText });
  }

  return (
    <article className="pcr-hat-card">
      <div className="pcr-hat-card-pill">قبعة {hat.index}</div>

      <div className="pcr-hat-preview" aria-hidden="true">
        {!hat.hasEmbroidery ? (
          <div className="pcr-hat-empty-preview">بدون تطريز</div>
        ) : hat.image ? (
          <img src={hat.image} alt="" />
        ) : (
          <div className="pcr-hat-preview-empty" />
        )}
      </div>

      <div className="pcr-hat-table">
        {rows.map(row => (
          <div className="pcr-hat-table-row" key={row.label}>
            <row.icon />
            <strong>{row.label} :</strong>
            <span>{row.value}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function NameListPage({
  pageNumber,
  rows,
}: {
  pageNumber: number;
  rows: MockNameRow[];
}) {
  return (
    <ReportPage pageNumber={pageNumber}>
      <header className="pcr-page-two-header pcr-names-page-header">
        <img src="/logo.svg" alt="AREBA" className="pcr-logo-small" />
        <DecoratedTitle>قائمة الأسماء</DecoratedTitle>
      </header>

      <section className="pcr-names-table-wrap" aria-label="قائمة الأسماء">
        <table className="pcr-names-table">
          <colgroup>
            <col className="pcr-col-index" />
            <col className="pcr-col-name" />
            <col className="pcr-col-size" />
            <col className="pcr-col-scarf" />
            <col className="pcr-col-hat" />
            <col className="pcr-col-back" />
            <col className="pcr-col-logo" />
          </colgroup>
          <thead>
            <tr>
              <th>#</th>
              <th>الاسم</th>
              <th>المقاس</th>
              <th>الوشاح</th>
              <th>القبعة</th>
              <th>عبارة التطريز في الخلف</th>
              <th>يوجد شعار ؟</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.index}>
                <td className="pcr-name-index">{row.index}</td>
                <td className="pcr-name-cell">{row.name}</td>
                <td className="pcr-size-cell">{row.size}</td>
                <td><span className="pcr-table-badge">{row.scarf}</span></td>
                <td><span className="pcr-table-badge">{row.hat}</span></td>
                <td className="pcr-back-text">{row.backText || ''}</td>
                <td>
                  {row.hasLogo && (
                    <span className="pcr-logo-check">
                      ✓
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </ReportPage>
  );
}

function ThankYouPage({ pageNumber }: { pageNumber: number }) {
  return (
    <ReportPage pageNumber={pageNumber} className="pcr-thanks-page">
      <header className="pcr-thanks-header">
        <img src="/logo.svg" alt="AREBA" className="pcr-logo-small" />
      </header>

      <section className="pcr-thanks-content" aria-label="شكراً لكم">
        <DecoratedTitle>شكراً لكم</DecoratedTitle>
        <p>
          نشكركم على ثقتكم بمتجر Areba
          <br />
          ونسعد بخدمتكم دائماً
        </p>
      </section>
    </ReportPage>
  );
}

function ReportPage({
  children,
  pageNumber,
  footerLabel,
  className,
}: {
  children: ReactNode;
  pageNumber: number;
  footerLabel?: string;
  className?: string;
}) {
  return (
    <section className={`pcr-page pcr-page-${pageNumber}${className ? ` ${className}` : ''}`}>
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
  imageUrl,
  showFallbackPreview = false,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  preview?: 'abaya' | 'sleeve';
  imageUrl?: string;
  showFallbackPreview?: boolean;
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
          {imageUrl ? (
            <img className="pcr-product-preview-image" src={imageUrl} alt="" />
          ) : showFallbackPreview ? (
            <div className={`pcr-product-preview pcr-product-preview-${preview}`} />
          ) : (
            <div className="pcr-product-preview-empty" />
          )}
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
