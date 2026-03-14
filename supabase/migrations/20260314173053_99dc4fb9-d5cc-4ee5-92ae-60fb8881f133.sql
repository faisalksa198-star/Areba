
-- Salla Orders table
CREATE TABLE public.salla_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salla_order_number text NOT NULL DEFAULT '',
  internal_number integer NOT NULL DEFAULT 1000,
  status public.order_status NOT NULL DEFAULT 'pending_data',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Auto-increment internal_number starting from 1000
CREATE OR REPLACE FUNCTION public.generate_salla_internal_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  _next_num integer;
BEGIN
  SELECT COALESCE(MAX(internal_number), 999) + 1
  INTO _next_num
  FROM public.salla_orders;
  NEW.internal_number := _next_num;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_salla_internal_number
  BEFORE INSERT ON public.salla_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_salla_internal_number();

-- Updated_at trigger
CREATE TRIGGER trg_salla_orders_updated_at
  BEFORE UPDATE ON public.salla_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Salla Order Items table
CREATE TABLE public.salla_order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salla_order_id uuid NOT NULL REFERENCES public.salla_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.salla_products(id) ON DELETE SET NULL,
  category text NOT NULL DEFAULT 'kit',
  quantity integer NOT NULL DEFAULT 1,
  option_values jsonb NOT NULL DEFAULT '{}',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_salla_order_items_updated_at
  BEFORE UPDATE ON public.salla_order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS for salla_orders
ALTER TABLE public.salla_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth can view salla_orders" ON public.salla_orders
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Auth can insert salla_orders" ON public.salla_orders
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'customer_service'));

CREATE POLICY "Auth can update salla_orders" ON public.salla_orders
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'customer_service'));

CREATE POLICY "Owners/managers can delete salla_orders" ON public.salla_orders
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'));

-- RLS for salla_order_items
ALTER TABLE public.salla_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth can view salla_order_items" ON public.salla_order_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Auth can insert salla_order_items" ON public.salla_order_items
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'customer_service'));

CREATE POLICY "Auth can update salla_order_items" ON public.salla_order_items
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'customer_service'));

CREATE POLICY "Owners/managers can delete salla_order_items" ON public.salla_order_items
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'));
