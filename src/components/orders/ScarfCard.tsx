import { ImageOff } from 'lucide-react';

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

function ImageSlot({ src, alt }: { src?: string | null; alt: string }) {
  return (
    <div
      className="rounded-lg border border-border overflow-hidden bg-muted/10 flex items-center justify-center"
      style={{ width: 80, height: 80 }}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          style={{ width: 80, height: 80, objectFit: 'contain' }}
          loading="lazy"
        />
      ) : (
        <ImageOff className="h-6 w-6 text-muted-foreground/40" />
      )}
    </div>
  );
}

export default function ScarfCard({ scarf, index }: Props) {
  const meta = [
    { label: 'أطراف الوشاح', value: scarf.scarf_method_name },
    { label: 'لون التطريز', value: scarf.embroidery_color },
    { label: 'اتجاه التطريز', value: scarf.embroidery_direction_name },
    { label: 'خط التطريز', value: scarf.font_name },
  ].filter(m => m.value);

  return (
    <div className="min-w-[220px] rounded-xl border border-border bg-card shadow-sm flex-shrink-0 overflow-hidden">
      <div className="px-3 py-1.5 border-b border-border bg-muted/20">
        <span className="text-xs font-semibold text-muted-foreground">وشاح {index + 1}</span>
      </div>
      <div className="p-3">
        {/* Images: scarf left, date right */}
        <div className="flex gap-2 mb-2">
          <ImageSlot src={scarf.scarf_style_image} alt="تصميم الوشاح" />
          <ImageSlot src={scarf.date_type_image} alt="نوع التاريخ" />
        </div>
        {/* Vertical text metadata */}
        {meta.length > 0 && (
          <div className="space-y-0.5 text-[11px]">
            {meta.map(m => (
              <p key={m.label} className="text-muted-foreground">
                <span className="font-medium text-foreground">{m.label}:</span> {m.value}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
