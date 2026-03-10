ALTER TABLE public.ready_kits ADD COLUMN IF NOT EXISTS date_type_id uuid REFERENCES public.date_types(id);
ALTER TABLE public.ready_kits ADD COLUMN IF NOT EXISTS embroidery_direction_id uuid REFERENCES public.embroidery_directions(id);
ALTER TABLE public.ready_kits ADD COLUMN IF NOT EXISTS embroidery_color text;