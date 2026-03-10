
CREATE TABLE public.pricing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  min_quantity integer NOT NULL,
  max_quantity integer NOT NULL,
  price_per_kit numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;

-- Everyone can read pricing rules (public calculator)
CREATE POLICY "Anyone can view pricing_rules" ON public.pricing_rules FOR SELECT TO public USING (true);

-- Only owners/managers can manage
CREATE POLICY "Owners/managers insert pricing_rules" ON public.pricing_rules FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Owners/managers update pricing_rules" ON public.pricing_rules FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Owners/managers delete pricing_rules" ON public.pricing_rules FOR DELETE TO authenticated USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
