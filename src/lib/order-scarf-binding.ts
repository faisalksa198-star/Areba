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
  const scarfStyle = firstRelated((row.scarf_style ?? row.scarf_styles) as RelatedLookup);
  const dateType = firstRelated((row.date_type ?? row.date_types) as RelatedLookup);
  const scarfMethod = firstRelated((row.scarf_method ?? row.scarf_methods) as RelatedLookup);
  const embroideryDirection = firstRelated(row.embroidery_directions);
  const font = firstRelated(row.fonts);

  const scarfStyleName = scarfStyle?.name ?? row.scarf_style_name ?? null;
  const scarfStyleImage = scarfStyle?.image_url ?? row.scarf_style_image_url ?? row.scarf_style_image ?? null;
  const dateTypeName = dateType?.name ?? row.date_type_name ?? null;
  const dateTypeImage = dateType?.image_url ?? row.date_type_image_url ?? row.date_type_image ?? null;

  return {
    id: row.id,
    sort_order: row.sort_order ?? 1,
    scarf_style_name: scarfStyleName,
    scarf_style_image: toImagePublicUrl(scarfStyleImage),
    date_type_name: dateTypeName,
    date_type_image: toImagePublicUrl(dateTypeImage),
    scarf_method_name: scarfMethod?.name ?? row.scarf_method_name ?? null,
    embroidery_direction_name: embroideryDirection?.name ?? row.embroidery_direction_name ?? null,
    font_name: font?.name ?? row.font_name ?? null,
    embroidery_color: row.embroidery_color ?? null,
  };
}
