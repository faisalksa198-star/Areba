
-- Add permissive SELECT policy for anon users to view orders (needed for registration/status pages)
CREATE POLICY "Anon can view orders"
ON public.orders
FOR SELECT
TO anon
USING (true);
