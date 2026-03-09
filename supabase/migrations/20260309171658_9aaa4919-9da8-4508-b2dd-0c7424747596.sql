
-- Add anon SELECT policies to reference tables so leader page (anonymous access) can read joined data

CREATE POLICY "Anon can view abaya_designs"
ON public.abaya_designs
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Anon can view sleeve_styles"
ON public.sleeve_styles
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Anon can view ready_kits"
ON public.ready_kits
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Anon can view hat_styles"
ON public.hat_styles
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Anon can view hat_embroideries"
ON public.hat_embroideries
FOR SELECT
TO anon
USING (true);
