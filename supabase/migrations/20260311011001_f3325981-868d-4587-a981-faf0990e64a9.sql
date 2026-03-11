
CREATE POLICY "Anon can update open orders"
ON public.orders
FOR UPDATE
TO anon
USING (COALESCE(data_submitted, false) = false)
WITH CHECK (COALESCE(data_submitted, false) = false OR (data_submitted = true AND status = 'under_review'));
