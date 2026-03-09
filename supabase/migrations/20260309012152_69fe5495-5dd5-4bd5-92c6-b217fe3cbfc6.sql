-- Tighten RLS write policies to avoid overly-permissive (true) checks

-- Students: allow public link usage but only while order is not submitted
DROP POLICY IF EXISTS "Anon can insert students" ON public.students;
DROP POLICY IF EXISTS "Anon can update students" ON public.students;
-- keep read policy as-is

CREATE POLICY "Public can insert students for open orders"
ON public.students
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = students.order_id
      AND COALESCE(o.data_submitted, false) = false
  )
);

CREATE POLICY "Public can update students for open orders"
ON public.students
FOR UPDATE
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = students.order_id
      AND COALESCE(o.data_submitted, false) = false
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = students.order_id
      AND COALESCE(o.data_submitted, false) = false
  )
);

-- Order scarf designs: only the employee who owns the order, or owner/manager, can write
DROP POLICY IF EXISTS "Auth users can insert order_scarf_designs" ON public.order_scarf_designs;
DROP POLICY IF EXISTS "Auth users can update order_scarf_designs" ON public.order_scarf_designs;
DROP POLICY IF EXISTS "Auth users can delete order_scarf_designs" ON public.order_scarf_designs;

CREATE POLICY "Employee/owners can insert scarf designs"
ON public.order_scarf_designs
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = order_scarf_designs.order_id
      AND (o.employee_id = auth.uid() OR public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'))
  )
);

CREATE POLICY "Employee/owners can update scarf designs"
ON public.order_scarf_designs
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = order_scarf_designs.order_id
      AND (o.employee_id = auth.uid() OR public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = order_scarf_designs.order_id
      AND (o.employee_id = auth.uid() OR public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'))
  )
);

CREATE POLICY "Employee/owners can delete scarf designs"
ON public.order_scarf_designs
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = order_scarf_designs.order_id
      AND (o.employee_id = auth.uid() OR public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'))
  )
);

-- Audit logs: avoid permissive insert policy
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated can insert own audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());