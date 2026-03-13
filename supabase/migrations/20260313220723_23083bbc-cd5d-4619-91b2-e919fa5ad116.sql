
-- Add extra scarf/hat counts to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS extra_scarf_count integer DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS extra_hat_count integer DEFAULT 0;

-- Extra scarves table (name + scarf design only, no size)
CREATE TABLE public.extra_scarves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  serial_number integer NOT NULL,
  name text NOT NULL DEFAULT '',
  scarf_design_id uuid REFERENCES public.order_scarf_designs(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.extra_scarves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view extra_scarves" ON public.extra_scarves FOR SELECT TO public USING (true);
CREATE POLICY "Anon can insert extra_scarves for open orders" ON public.extra_scarves FOR INSERT TO anon, authenticated WITH CHECK (EXISTS (SELECT 1 FROM orders o WHERE o.id = extra_scarves.order_id AND COALESCE(o.data_submitted, false) = false));
CREATE POLICY "Anon can update extra_scarves for open orders" ON public.extra_scarves FOR UPDATE TO anon, authenticated USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = extra_scarves.order_id AND COALESCE(o.data_submitted, false) = false));
CREATE POLICY "Auth can delete extra_scarves" ON public.extra_scarves FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = extra_scarves.order_id AND (o.employee_id = auth.uid() OR has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role))));

-- Extra hats table
CREATE TABLE public.extra_hats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  serial_number integer NOT NULL,
  hat_embroidery_id uuid REFERENCES public.hat_embroideries(id),
  hat_extra_text text,
  fringe_color text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.extra_hats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view extra_hats" ON public.extra_hats FOR SELECT TO public USING (true);
CREATE POLICY "Anon can insert extra_hats for open orders" ON public.extra_hats FOR INSERT TO anon, authenticated WITH CHECK (EXISTS (SELECT 1 FROM orders o WHERE o.id = extra_hats.order_id AND COALESCE(o.data_submitted, false) = false));
CREATE POLICY "Anon can update extra_hats for open orders" ON public.extra_hats FOR UPDATE TO anon, authenticated USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = extra_hats.order_id AND COALESCE(o.data_submitted, false) = false));
CREATE POLICY "Auth can delete extra_hats" ON public.extra_hats FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = extra_hats.order_id AND (o.employee_id = auth.uid() OR has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role))));
