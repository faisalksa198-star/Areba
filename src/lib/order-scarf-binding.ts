import { supabase } from '@/integrations/supabase/client';

type RelatedLookup =
  | { name?: string | null; image_url?: string | null }
  | { name?: string | null; image_url?: string | null }[]
  | null
  | undefined;

function firstRelated(value: RelatedLookup): { name?: string | null; image_url?: string | null } | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

export function toImagePublicUrl(pathOrUrl?: string | null): string | null {
  if (!pathOrUrl) return null;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;

  const { data } = supabase.storage.from('images').getPublicUrl(pathOrUrl);
  return data.publicUrl || null;
}

export function mapOrderScarfDesign(row: any) {
  const scarfStyle = firstRelated(row.scarf_styles);
  const dateType = firstRelated(row.date_types);
  const scarfMethod = firstRelated(row.scarf_methods);
  const embroideryDirection = firstRelated(row.embroidery_directions);
  const font = firstRelated(row.fonts);

  return {
    id: row.id,
    sort_order: row.sort_order ?? 1,
    scarf_style_name: scarfStyle?.name ?? null,
    scarf_style_image: toImagePublicUrl(scarfStyle?.image_url ?? null),
    date_type_name: dateType?.name ?? null,
    date_type_image: toImagePublicUrl(dateType?.image_url ?? null),
    scarf_method_name: scarfMethod?.name ?? null,
    embroidery_direction_name: embroideryDirection?.name ?? null,
    font_name: font?.name ?? null,
    embroidery_color: row.embroidery_color ?? null,
  };
}
