import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer';

// ─────────────────────────────────────────────────────────
// Local Arabic font registration (Tajawal)
// ─────────────────────────────────────────────────────────
Font.register({
  family: 'Tajawal',
  fonts: [
    { src: '/fonts/Tajawal-Regular.ttf', fontWeight: 'normal' },
    { src: '/fonts/Tajawal-Medium.ttf', fontWeight: 'medium' },
    { src: '/fonts/Tajawal-Bold.ttf', fontWeight: 'bold' },
  ],
});
Font.registerHyphenationCallback((word) => [word]); // disable hyphenation for Arabic

// ─────────────────────────────────────────────────────────
// Brand tokens
// ─────────────────────────────────────────────────────────
const BRAND = '#440376';
const BRAND_LIGHT = '#6B21A8';
const BG = '#faf7ff';
const BORDER = '#ede9f5';
const INK = '#2d1b4e';
const MUTED = '#8b7fa8';

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────
export interface ReportStudentRow {
  serial: string;
  name: string;
  size: string;
  scarfNum: string;
  hatDesignNum: string;
  hatExtraText: string;
  backText: string;
  hasLogo: boolean;
}

export interface ReportScarfDesign {
  index: number;
  styleName?: string;
  methodName?: string;
  embroideryDirection?: string;
  dateName?: string;
  fontName?: string;
  embroideryColor?: string;
  styleImage?: string; // data URL
  dateImage?: string;
}

export interface ReportHatGroup {
  index: number;
  name: string;
  image?: string;
  count: number;
  fringes: string[];
}

export interface ReportData {
  logo: string;
  orderNumber: string;
  createdAt: string;
  leaderName?: string;
  schoolName?: string;
  orderTypeLabel: string;
  kitName?: string;
  studentCount?: number;
  extraScarfCount?: number;
  extraHatCount?: number;
  executionDuration?: number;

  abayaColor?: string;
  abayaLength?: string;
  sleeveStyleName?: string;
  sleeveColor?: string;

  scarfColor?: string;
  hatColor?: string;

  logoEmbroideryCount?: number;
  backEmbroideryCount?: number;
  hatEmbroideryCount?: number;

  scarves: ReportScarfDesign[];
  hats: ReportHatGroup[];
  students: ReportStudentRow[];

  hasBackCol: boolean;
  hasLogoCol: boolean;
  hasHatTextCol: boolean;

  recipientName?: string;
  recipientPhone?: string;
  shippingCity?: string;
  district?: string;
  addressDetails?: string;
  nationalAddress?: string;
}

// ─────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: 'Tajawal',
    fontSize: 10,
    color: INK,
    backgroundColor: BG,
    paddingTop: 70,
    paddingBottom: 50,
    paddingHorizontal: 32,
  },
  // Header (fixed on every page)
  header: {
    position: 'absolute',
    top: 18,
    left: 32,
    right: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1.5,
    borderBottomColor: BRAND,
    borderBottomStyle: 'solid',
  },
  headerOrder: {
    fontSize: 9,
    color: MUTED,
    textAlign: 'left',
  },
  headerOrderNum: {
    fontSize: 11,
    color: BRAND,
    fontWeight: 'bold',
  },
  headerLogo: { height: 26 },

  // Footer (fixed)
  footer: {
    position: 'absolute',
    bottom: 18,
    left: 32,
    right: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: MUTED,
    borderTopWidth: 0.5,
    borderTopColor: BORDER,
    borderTopStyle: 'solid',
    paddingTop: 6,
  },

  // Section banner
  sectionBanner: {
    alignSelf: 'flex-end',
    marginBottom: 12,
    paddingBottom: 6,
    paddingHorizontal: 4,
    borderBottomWidth: 2.5,
    borderBottomColor: BRAND,
    borderBottomStyle: 'solid',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: BRAND,
    textAlign: 'right',
  },

  // Cover
  coverWrap: { alignItems: 'center', marginTop: 30, marginBottom: 24 },
  coverLogo: { height: 56, marginBottom: 14 },
  coverTitle: { fontSize: 22, fontWeight: 'bold', color: BRAND, marginBottom: 4 },
  coverSubtitle: { fontSize: 11, color: MUTED, marginBottom: 10 },
  coverDivider: { width: 60, height: 3, backgroundColor: BRAND, borderRadius: 2 },

  // Info card
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    borderStyle: 'solid',
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
    borderBottomStyle: 'solid',
  },
  infoLabel: { fontSize: 10, color: MUTED, textAlign: 'right' },
  infoValue: { fontSize: 10, fontWeight: 'bold', color: INK, textAlign: 'left' },

  // Products section
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', gap: 10 },
  productCard: {
    width: '48.5%',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    borderStyle: 'solid',
    overflow: 'hidden',
    marginBottom: 10,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
    borderBottomStyle: 'solid',
    gap: 6,
  },
  badge: {
    minWidth: 22, height: 22, borderRadius: 4, paddingHorizontal: 4,
    backgroundColor: BRAND, color: '#fff', fontWeight: 'bold', fontSize: 10,
    textAlign: 'center', paddingTop: 4,
  },
  productImagesRow: { flexDirection: 'row', padding: 6, gap: 6, justifyContent: 'center' },
  productImageBox: {
    flex: 1, height: 100, backgroundColor: BG, borderRadius: 6,
    borderWidth: 0.5, borderColor: BORDER, borderStyle: 'solid',
    justifyContent: 'center', alignItems: 'center', padding: 4,
  },
  productImage: { maxHeight: 90, objectFit: 'contain' },
  productDetail: { fontSize: 9, color: MUTED, marginVertical: 1, textAlign: 'right' },

  // Hats grid
  hatCard: {
    width: '48.5%',
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    borderStyle: 'solid',
    overflow: 'hidden',
    marginBottom: 10,
  },
  hatImageBox: {
    width: 80, backgroundColor: BG, justifyContent: 'center', alignItems: 'center', padding: 4,
  },
  hatImage: { maxHeight: 70, maxWidth: 70, objectFit: 'contain' },

  // Students table
  tableWrap: {
    borderWidth: 1, borderColor: BORDER, borderStyle: 'solid',
    borderRadius: 8, overflow: 'hidden', marginBottom: 6,
  },
  tableHeader: {
    flexDirection: 'row-reverse',
    backgroundColor: BRAND,
  },
  tableHeaderCell: {
    color: '#fff', fontSize: 9.5, fontWeight: 'bold',
    paddingVertical: 8, paddingHorizontal: 4, textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row-reverse',
    borderBottomWidth: 0.5, borderBottomColor: BORDER, borderBottomStyle: 'solid',
    minHeight: 22,
  },
  tableCell: {
    fontSize: 9, paddingVertical: 6, paddingHorizontal: 4, textAlign: 'center',
    color: INK,
  },
  serialCell: { color: BRAND, fontWeight: 'bold' },
  circleBadge: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 1.5, borderColor: BRAND, borderStyle: 'solid',
    color: BRAND, fontSize: 9, fontWeight: 'bold',
    textAlign: 'center', paddingTop: 3,
    alignSelf: 'center',
  },
  checkmark: { color: '#16a34a', fontWeight: 'bold', fontSize: 12 },

  // Thank you
  thanksWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  thanksTitle: { fontSize: 22, fontWeight: 'bold', color: BRAND, marginBottom: 8 },
  thanksText: { fontSize: 11, color: MUTED, textAlign: 'center', maxWidth: 320 },
});

// Column widths (must sum to 100)
function buildColumns(d: ReportData) {
  const cols: { key: string; label: string; width: string }[] = [];
  cols.push({ key: 'serial', label: '#', width: '8%' });
  cols.push({ key: 'name', label: 'الاسم', width: '34%' });
  cols.push({ key: 'size', label: 'المقاس', width: '10%' });
  cols.push({ key: 'scarf', label: 'الوشاح', width: '10%' });
  if (d.hasHatTextCol) cols.push({ key: 'hat', label: 'القبعة', width: '18%' });
  if (d.hasBackCol) cols.push({ key: 'back', label: 'تطريز خلفي', width: '14%' });
  if (d.hasLogoCol) cols.push({ key: 'logo', label: 'شعار', width: '6%' });
  // normalize
  const totalW = cols.reduce((a, c) => a + parseFloat(c.width), 0);
  cols.forEach(c => { c.width = `${(parseFloat(c.width) / totalW) * 100}%`; });
  return cols;
}

// ─────────────────────────────────────────────────────────
// Reusable components
// ─────────────────────────────────────────────────────────
const ReportHeader: React.FC<{ d: ReportData }> = ({ d }) => (
  <View style={s.header} fixed>
    <View>
      <Text style={s.headerOrder}>طلب رقم</Text>
      <Text style={s.headerOrderNum}>{d.orderNumber}</Text>
    </View>
    {d.logo ? <Image src={d.logo} style={s.headerLogo} /> : null}
  </View>
);

const ReportFooter: React.FC = () => (
  <View style={s.footer} fixed>
    <Text render={({ pageNumber, totalPages }) => `صفحة ${pageNumber} من ${totalPages}`} />
    <Text>{new Date().toLocaleDateString('ar-SA')}</Text>
  </View>
);

const SectionBanner: React.FC<{ title: string }> = ({ title }) => (
  <View style={s.sectionBanner}>
    <Text style={s.sectionTitle}>{title}</Text>
  </View>
);

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={s.infoRow}>
    <Text style={s.infoValue}>{value}</Text>
    <Text style={s.infoLabel}>{label}</Text>
  </View>
);

// Students table — header is fixed → repeats automatically on overflow
const StudentsTable: React.FC<{ d: ReportData }> = ({ d }) => {
  const cols = buildColumns(d);
  if (!d.students.length) return null;

  return (
    <View>
      <SectionBanner title="قائمة الأسماء" />
      <View style={s.tableWrap}>
        {/* fixed header repeats on every overflow page */}
        <View style={s.tableHeader} fixed>
          {cols.map(c => (
            <Text key={c.key} style={[s.tableHeaderCell, { width: c.width }]}>{c.label}</Text>
          ))}
        </View>

        {d.students.map((r, i) => (
          <View
            key={`${r.serial}-${i}`}
            style={[s.tableRow, { backgroundColor: i % 2 === 0 ? '#fff' : '#faf8ff' }]}
            wrap={false}
          >
            {cols.map(c => {
              const w = { width: c.width };
              switch (c.key) {
                case 'serial':
                  return <Text key={c.key} style={[s.tableCell, s.serialCell, w]}>{r.serial}</Text>;
                case 'name':
                  return <Text key={c.key} style={[s.tableCell, { textAlign: 'right', paddingRight: 8 }, w]}>{r.name}</Text>;
                case 'size':
                  return <Text key={c.key} style={[s.tableCell, w]}>{r.size}</Text>;
                case 'scarf':
                  return (
                    <View key={c.key} style={[w, { padding: 4, alignItems: 'center', justifyContent: 'center' }]}>
                      {r.scarfNum ? <Text style={s.circleBadge}>{r.scarfNum}</Text> : <Text></Text>}
                    </View>
                  );
                case 'hat':
                  return (
                    <View key={c.key} style={[w, { padding: 4, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4 }]}>
                      {r.hatDesignNum ? <Text style={s.circleBadge}>{r.hatDesignNum}</Text> : null}
                      {r.hatExtraText ? <Text style={{ fontSize: 8, color: MUTED }}>{r.hatExtraText}</Text> : null}
                    </View>
                  );
                case 'back':
                  return <Text key={c.key} style={[s.tableCell, { fontSize: 8 }, w]}>{r.backText}</Text>;
                case 'logo':
                  return (
                    <View key={c.key} style={[w, { alignItems: 'center', justifyContent: 'center' }]}>
                      {r.hasLogo ? <Text style={s.checkmark}>✓</Text> : <Text></Text>}
                    </View>
                  );
                default:
                  return null;
              }
            })}
          </View>
        ))}
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────
// Main Document
// ─────────────────────────────────────────────────────────
export const ReportDocument: React.FC<{ data: ReportData }> = ({ data: d }) => {
  const hasShipping = !!(d.recipientName || d.recipientPhone || d.shippingCity);
  const hasProducts = d.scarves.length > 0 || d.hats.length > 0;

  return (
    <Document>
      {/* ── PAGE 1: COVER + ORDER SUMMARY ───────────────────── */}
      <Page size="A4" style={s.page}>
        <ReportHeader d={d} />
        <ReportFooter />

        <View style={s.coverWrap}>
          {d.logo ? <Image src={d.logo} style={s.coverLogo} /> : null}
          <Text style={s.coverTitle}>تقرير الطلب</Text>
          <Text style={s.coverSubtitle}>متجر آريبا</Text>
          <View style={s.coverDivider} />
        </View>

        <SectionBanner title="بيانات الطلب" />
        <View style={s.card}>
          <InfoRow label="رقم الطلب" value={d.orderNumber} />
          {d.createdAt && <InfoRow label="تاريخ الطلب" value={d.createdAt} />}
          {d.executionDuration ? <InfoRow label="مدة التنفيذ (أيام)" value={String(d.executionDuration)} /> : null}
          {d.leaderName && <InfoRow label="اسم القائدة" value={d.leaderName} />}
          {d.schoolName && <InfoRow label="اسم المدرسة" value={d.schoolName} />}
          <InfoRow label="نوع الطلب" value={d.orderTypeLabel} />
          {d.kitName && <InfoRow label="اسم الطقم" value={d.kitName} />}
          {d.studentCount ? <InfoRow label="عدد الأطقم" value={String(d.studentCount)} /> : null}
          {d.extraScarfCount ? <InfoRow label="الأوشحة الإضافية" value={String(d.extraScarfCount)} /> : null}
          {d.extraHatCount ? <InfoRow label="القبعات الإضافية" value={String(d.extraHatCount)} /> : null}
        </View>

        {(d.abayaColor || d.sleeveStyleName || d.sleeveColor || d.abayaLength) && (
          <>
            <SectionBanner title="تفاصيل العباية" />
            <View style={s.card}>
              {d.abayaColor && <InfoRow label="لون العباية" value={d.abayaColor} />}
              {d.abayaLength && <InfoRow label="طول العباية" value={d.abayaLength} />}
              {d.sleeveStyleName && <InfoRow label="طرف الكم" value={d.sleeveStyleName} />}
              {d.sleeveColor && <InfoRow label="لون طرف الكم" value={d.sleeveColor} />}
            </View>
          </>
        )}
      </Page>

      {/* ── PAGE 2: PRODUCTS (scarves + hats) ───────────────── */}
      {hasProducts && (
        <Page size="A4" style={s.page} wrap>
          <ReportHeader d={d} />
          <ReportFooter />

          {d.scarves.length > 0 && (
            <View>
              <SectionBanner title="تصاميم الأوشحة" />
              {d.scarfColor && (
                <Text style={{ textAlign: 'center', fontSize: 10, color: MUTED, marginBottom: 8 }}>
                  لون الوشاح: <Text style={{ color: INK, fontWeight: 'bold' }}>{d.scarfColor}</Text>
                </Text>
              )}
              <View style={s.productGrid}>
                {d.scarves.map(sd => (
                  <View key={sd.index} style={s.productCard} wrap={false}>
                    <View style={s.productHeader}>
                      <Text style={{ fontSize: 11, color: BRAND, fontWeight: 'bold' }}>وشاح {sd.index}</Text>
                      <Text style={s.badge}>{sd.index}</Text>
                    </View>
                    {(sd.styleImage || sd.dateImage) && (
                      <View style={s.productImagesRow}>
                        {sd.styleImage && (
                          <View style={s.productImageBox}>
                            <Image src={sd.styleImage} style={s.productImage} />
                          </View>
                        )}
                        {sd.dateImage && (
                          <View style={[s.productImageBox, { flex: 0.6 }]}>
                            <Image src={sd.dateImage} style={s.productImage} />
                          </View>
                        )}
                      </View>
                    )}
                    <View style={{ padding: 8 }}>
                      {sd.styleName && <Text style={s.productDetail}>التصميم: <Text style={{ color: INK, fontWeight: 'bold' }}>{sd.styleName}</Text></Text>}
                      {sd.methodName && <Text style={s.productDetail}>الطرف: <Text style={{ color: INK, fontWeight: 'bold' }}>{sd.methodName}</Text></Text>}
                      {sd.embroideryDirection && <Text style={s.productDetail}>اتجاه التطريز: <Text style={{ color: INK, fontWeight: 'bold' }}>{sd.embroideryDirection}</Text></Text>}
                      {sd.dateName && <Text style={s.productDetail}>التاريخ: <Text style={{ color: INK, fontWeight: 'bold' }}>{sd.dateName}</Text></Text>}
                      {sd.fontName && <Text style={s.productDetail}>الخط: <Text style={{ color: INK, fontWeight: 'bold' }}>{sd.fontName}</Text></Text>}
                      {sd.embroideryColor && <Text style={s.productDetail}>لون التطريز: <Text style={{ color: INK, fontWeight: 'bold' }}>{sd.embroideryColor}</Text></Text>}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {d.hats.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <SectionBanner title="تصاميم القبعات" />
              {d.hatColor && (
                <Text style={{ textAlign: 'center', fontSize: 10, color: MUTED, marginBottom: 8 }}>
                  لون القبعة: <Text style={{ color: INK, fontWeight: 'bold' }}>{d.hatColor}</Text>
                </Text>
              )}
              <View style={s.productGrid}>
                {d.hats.map(g => (
                  <View key={g.index} style={s.hatCard} wrap={false}>
                    {g.image && (
                      <View style={s.hatImageBox}>
                        <Image src={g.image} style={s.hatImage} />
                      </View>
                    )}
                    <View style={{ flex: 1, padding: 8 }}>
                      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Text style={s.badge}>{g.index}</Text>
                        <Text style={{ fontSize: 11, color: BRAND, fontWeight: 'bold' }}>قبعة {g.index}</Text>
                      </View>
                      <Text style={s.productDetail}>الاسم: <Text style={{ color: INK, fontWeight: 'bold' }}>{g.name}</Text></Text>
                      <Text style={s.productDetail}>الكمية: <Text style={{ color: INK, fontWeight: 'bold' }}>{g.count}</Text></Text>
                      {g.fringes.length > 0 && (
                        <Text style={s.productDetail}>الهدب: <Text style={{ color: INK, fontWeight: 'bold' }}>{g.fringes.join('، ')}</Text></Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </Page>
      )}

      {/* ── STUDENTS TABLE PAGE (auto paginates) ───────────── */}
      {d.students.length > 0 && (
        <Page size="A4" style={s.page} wrap>
          <ReportHeader d={d} />
          <ReportFooter />
          <StudentsTable d={d} />
        </Page>
      )}

      {/* ── FINAL PAGE: SHIPPING + THANK YOU ───────────────── */}
      <Page size="A4" style={s.page}>
        <ReportHeader d={d} />
        <ReportFooter />

        {hasShipping && (
          <>
            <SectionBanner title="بيانات الشحن" />
            <View style={s.card}>
              {d.recipientName && <InfoRow label="اسم المستلم" value={d.recipientName} />}
              {d.recipientPhone && <InfoRow label="رقم الجوال" value={d.recipientPhone} />}
              {d.shippingCity && <InfoRow label="المدينة" value={d.shippingCity} />}
              {d.district && <InfoRow label="الحي" value={d.district} />}
              {d.addressDetails && <InfoRow label="تفاصيل العنوان" value={d.addressDetails} />}
              {d.nationalAddress && <InfoRow label="العنوان الوطني" value={d.nationalAddress} />}
            </View>
          </>
        )}

        <View style={s.thanksWrap}>
          <Text style={s.thanksTitle}>شكراً لكم</Text>
          <Text style={s.thanksText}>نشكركم على ثقتكم بمتجر آريبا ونسعد بخدمتكم دائماً</Text>
          <View style={[s.coverDivider, { marginTop: 18 }]} />
        </View>
      </Page>
    </Document>
  );
};
