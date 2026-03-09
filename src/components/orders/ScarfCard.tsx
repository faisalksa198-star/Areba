interface ScarfDesign {
  id: string;
  sort_order: number;
  scarf_style_name?: string;
  date_type_name?: string;
  scarf_method_name?: string;
  embroidery_direction_name?: string;
  font_name?: string;
  embroidery_color?: string;
  scarf_style_image?: string | null;
  date_type_image?: string | null;
}

interface Props {
  scarf: ScarfDesign;
  index: number;
}

export default function ScarfCard({ scarf, index }: Props) {
  return (
    <div className="min-w-[220px] rounded-xl border border-border bg-card shadow-sm flex-shrink-0 overflow-hidden">
      <div className="px-3 py-1.5 border-b border-border bg-muted/20">
        <span className="text-xs font-semibold text-muted-foreground">وشاح {index + 1}</span>
      </div>
      <div className="p-3">
        {/* Images row: scarf left, date right */}
        <div className="flex gap-2 mb-2">
          {scarf.scarf_style_image && (
            <div className="rounded-lg border border-border overflow-hidden bg-muted/10 flex items-center justify-center" style={{ width: 80, height: 80 }}>
              <img src={scarf.scarf_style_image} alt="تصميم الوشاح" style={{ width: 80, height: 80, objectFit: 'contain' }} />
            </div>
          )}
          {scarf.date_type_image && (
            <div className="rounded-lg border border-border overflow-hidden bg-muted/10 flex items-center justify-center" style={{ width: 80, height: 80 }}>
              <img src={scarf.date_type_image} alt="نوع التاريخ" style={{ width: 80, height: 80, objectFit: 'contain' }} />
            </div>
          )}
        </div>
        {/* Vertical text metadata */}
        <div className="space-y-0.5 text-[11px]">
          {scarf.scarf_method_name && (
            <p className="text-muted-foreground"><span className="font-medium text-foreground">أطراف الوشاح:</span> {scarf.scarf_method_name}</p>
          )}
          {scarf.embroidery_color && (
            <p className="text-muted-foreground"><span className="font-medium text-foreground">لون التطريز:</span> {scarf.embroidery_color}</p>
          )}
          {scarf.embroidery_direction_name && (
            <p className="text-muted-foreground"><span className="font-medium text-foreground">اتجاه التطريز:</span> {scarf.embroidery_direction_name}</p>
          )}
          {scarf.font_name && (
            <p className="text-muted-foreground"><span className="font-medium text-foreground">خط التطريز:</span> {scarf.font_name}</p>
          )}
        </div>
      </div>
    </div>
  );
}
