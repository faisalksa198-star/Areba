
-- Create missing master data tables

-- Hat styles (أشكال القبعات)
CREATE TABLE public.hat_styles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.hat_styles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth can view hat_styles" ON public.hat_styles FOR SELECT USING (true);
CREATE POLICY "Owners/managers manage hat_styles" ON public.hat_styles FOR ALL USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Scarf methods / طرق الوشاح
CREATE TABLE public.scarf_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.scarf_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth can view scarf_methods" ON public.scarf_methods FOR SELECT USING (true);
CREATE POLICY "Owners/managers manage scarf_methods" ON public.scarf_methods FOR ALL USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Embroidery directions / اتجاه التطريز
CREATE TABLE public.embroidery_directions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.embroidery_directions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth can view embroidery_directions" ON public.embroidery_directions FOR SELECT USING (true);
CREATE POLICY "Owners/managers manage embroidery_directions" ON public.embroidery_directions FOR ALL USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Date types / أنواع التواريخ
CREATE TABLE public.date_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.date_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth can view date_types" ON public.date_types FOR SELECT USING (true);
CREATE POLICY "Owners/managers manage date_types" ON public.date_types FOR ALL USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Add new columns to ready_kits for expanded kit config
ALTER TABLE public.ready_kits
  ADD COLUMN IF NOT EXISTS sleeve_color TEXT,
  ADD COLUMN IF NOT EXISTS abaya_color TEXT,
  ADD COLUMN IF NOT EXISTS abaya_color_degree TEXT,
  ADD COLUMN IF NOT EXISTS scarf_color_degree TEXT,
  ADD COLUMN IF NOT EXISTS hat_color TEXT,
  ADD COLUMN IF NOT EXISTS hat_color_degree TEXT,
  ADD COLUMN IF NOT EXISTS hat_style_id UUID REFERENCES public.hat_styles(id),
  ADD COLUMN IF NOT EXISTS scarf_method_id UUID REFERENCES public.scarf_methods(id),
  ADD COLUMN IF NOT EXISTS default_scarf_design TEXT;
