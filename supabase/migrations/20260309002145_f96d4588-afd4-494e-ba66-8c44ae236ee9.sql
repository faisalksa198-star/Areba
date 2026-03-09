
-- Add order_type and custom design fields to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_type text DEFAULT 'ready_kit';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS custom_abaya_color text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS custom_abaya_color_degree text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS custom_scarf_color text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS custom_scarf_color_degree text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS custom_hat_color text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS custom_hat_color_degree text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS color_image_url text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS abaya_design_id uuid REFERENCES public.abaya_designs(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS sleeve_style_id uuid REFERENCES public.sleeve_styles(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS sleeve_color text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS logo_embroidery_enabled boolean DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS logo_embroidery_count integer DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS back_embroidery_enabled boolean DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS back_embroidery_count integer DEFAULT 0;

-- Create order_scarf_designs table for multiple scarf designs per order
CREATE TABLE public.order_scarf_designs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  scarf_style_id uuid REFERENCES public.scarf_styles(id),
  date_type_id uuid REFERENCES public.date_types(id),
  scarf_method_id uuid REFERENCES public.scarf_methods(id),
  embroidery_direction_id uuid REFERENCES public.embroidery_directions(id),
  font_id uuid REFERENCES public.fonts(id),
  embroidery_color text,
  sort_order integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.order_scarf_designs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view order_scarf_designs" ON public.order_scarf_designs FOR SELECT USING (true);
CREATE POLICY "Auth users can insert order_scarf_designs" ON public.order_scarf_designs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update order_scarf_designs" ON public.order_scarf_designs FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete order_scarf_designs" ON public.order_scarf_designs FOR DELETE TO authenticated USING (true);

-- Add new fields to students table
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS scarf_design_id uuid REFERENCES public.order_scarf_designs(id);
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS has_logo_embroidery boolean DEFAULT false;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS back_embroidery_text text;
