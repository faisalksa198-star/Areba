
-- 1. Sequence for order numbers starting at 5000
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START WITH 5000 INCREMENT BY 1;

-- 2. Function to auto-generate order_number on insert
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.order_number := EXTRACT(YEAR FROM now())::text || '-' || LPAD(nextval('public.order_number_seq')::text, 4, '0');
  RETURN NEW;
END;
$$;

-- 3. Trigger on orders insert
DROP TRIGGER IF EXISTS trg_generate_order_number ON public.orders;
CREATE TRIGGER trg_generate_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_order_number();

-- 4. Short links table
CREATE TABLE public.short_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  original_url text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read short_links" ON public.short_links
  FOR SELECT TO public USING (true);

CREATE POLICY "Auth can create short_links" ON public.short_links
  FOR INSERT TO authenticated WITH CHECK (true);
