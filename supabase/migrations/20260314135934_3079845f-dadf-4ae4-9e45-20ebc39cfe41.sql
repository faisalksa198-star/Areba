
-- Salla products table
CREATE TABLE public.salla_products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Salla product options (dynamic properties)
CREATE TABLE public.salla_product_options (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.salla_products(id) ON DELETE CASCADE,
  label text NOT NULL,
  values text[] NOT NULL DEFAULT '{}',
  is_required boolean NOT NULL DEFAULT false,
  default_value text,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.salla_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salla_product_options ENABLE ROW LEVEL SECURITY;

-- RLS for salla_products
CREATE POLICY "Anyone can view salla_products" ON public.salla_products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owners/managers insert salla_products" ON public.salla_products FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Owners/managers update salla_products" ON public.salla_products FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Owners/managers delete salla_products" ON public.salla_products FOR DELETE TO authenticated USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- RLS for salla_product_options
CREATE POLICY "Anyone can view salla_product_options" ON public.salla_product_options FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owners/managers insert salla_product_options" ON public.salla_product_options FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Owners/managers update salla_product_options" ON public.salla_product_options FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Owners/managers delete salla_product_options" ON public.salla_product_options FOR DELETE TO authenticated USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Updated_at triggers
CREATE TRIGGER update_salla_products_updated_at BEFORE UPDATE ON public.salla_products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_salla_product_options_updated_at BEFORE UPDATE ON public.salla_product_options FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
