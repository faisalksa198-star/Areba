
-- Add sort_order column to all master data tables
ALTER TABLE public.abaya_designs ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;
ALTER TABLE public.sleeve_styles ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;
ALTER TABLE public.scarf_styles ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;
ALTER TABLE public.scarf_methods ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;
ALTER TABLE public.embroidery_directions ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;
ALTER TABLE public.fonts ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;
ALTER TABLE public.date_types ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;
ALTER TABLE public.hat_styles ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;
ALTER TABLE public.hat_embroideries ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;
ALTER TABLE public.cities ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;
