
CREATE TABLE public.addon_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.addon_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view addon_prices" ON public.addon_prices FOR SELECT TO public USING (true);
CREATE POLICY "Owners/managers insert addon_prices" ON public.addon_prices FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "Owners/managers update addon_prices" ON public.addon_prices FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "Owners/managers delete addon_prices" ON public.addon_prices FOR DELETE TO authenticated USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'));

INSERT INTO public.addon_prices (key, name, price) VALUES
  ('scarf_qitan', 'وشاح بقيطان', 2),
  ('scarf_decorated', 'وشاح بخط مزخرف', 2),
  ('back_embroidery', 'تطريز في الخلف', 20),
  ('logo_embroidery', 'إضافة شعار', 20),
  ('hat_embroidery', 'تطريز قبعة', 20),
  ('purple_package', 'بكج Purple', 25);
