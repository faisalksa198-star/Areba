
-- Fix orders SELECT policies: change from RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "Anon can view orders" ON public.orders;
DROP POLICY IF EXISTS "Auth can view orders" ON public.orders;

CREATE POLICY "Anon can view orders" ON public.orders
  FOR SELECT TO anon USING (true);

CREATE POLICY "Auth can view orders" ON public.orders
  FOR SELECT TO authenticated USING (true);
